package im

import (
	"encoding/json"
	"net/http"
	"time"

	"hive/internal/common"
	"hive/internal/middleware"
	"hive/internal/models"
	"hive/internal/notify"
	"hive/internal/realtime"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

type Handler struct {
	DB     *gorm.DB
	Hub    *realtime.Hub
	Notify *notify.Service
	Secret string
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Conversations 返回当前用户参与的会话列表，附带未读数。
func (h *Handler) Conversations(c *gin.Context) {
	uid := middleware.CurrentUser(c)
	var members []models.ConversationMember
	h.DB.Where("user_id = ?", uid).Find(&members)

	out := make([]gin.H, 0, len(members))
	for _, m := range members {
		var conv models.Conversation
		if h.DB.First(&conv, "id = ?", m.ConversationID).Error != nil {
			continue
		}
		var unread int64
		h.DB.Model(&models.Message{}).
			Where("conversation_id = ? AND sender_id <> ? AND created_at > ?", conv.ID, uid, m.LastReadAt).
			Count(&unread)
		out = append(out, gin.H{"id": conv.ID, "name": conv.Name, "type": conv.Type, "projectId": conv.ProjectID, "unread": unread})
	}
	common.OK(c, out)
}

type createConvReq struct {
	Type      string   `json:"type"`
	Name      string   `json:"name"`
	MemberIDs []string `json:"memberIds"`
}

// CreateConversation 创建单聊/群聊会话，并把当前用户与所选成员加入。
func (h *Handler) CreateConversation(c *gin.Context) {
	var req createConvReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	uid := middleware.CurrentUser(c)
	typ := req.Type
	if typ == "" {
		if len(req.MemberIDs) <= 1 {
			typ = "single"
		} else {
			typ = "group"
		}
	}
	name := req.Name
	if name == "" {
		name = "新会话"
	}
	conv := models.Conversation{Type: typ, Name: name}
	if err := h.DB.Create(&conv).Error; err != nil {
		common.Fail(c, 500, "创建会话失败")
		return
	}
	seen := map[string]bool{}
	for _, m := range append(req.MemberIDs, uid) {
		if m == "" || seen[m] {
			continue
		}
		seen[m] = true
		h.DB.FirstOrCreate(&models.ConversationMember{}, models.ConversationMember{ConversationID: conv.ID, UserID: m})
	}
	common.Created(c, conv)
}

// Messages 返回会话的历史消息（含发送者）。
func (h *Handler) Messages(c *gin.Context) {
	var msgs []models.Message
	h.DB.Preload("Sender").Where("conversation_id = ?", c.Param("cid")).
		Order("created_at").Limit(100).Find(&msgs)
	common.OK(c, msgs)
}

// RecallMessage 撤回自己发送的消息，并广播给会话成员。
func (h *Handler) RecallMessage(c *gin.Context) {
	uid := middleware.CurrentUser(c)
	var m models.Message
	if err := h.DB.First(&m, "id = ?", c.Param("mid")).Error; err != nil {
		common.Fail(c, 404, "消息不存在")
		return
	}
	if m.SenderID != uid {
		common.Fail(c, 403, "只能撤回自己的消息")
		return
	}
	h.DB.Model(&m).Updates(map[string]any{"recalled": true, "content": ""})

	var members []models.ConversationMember
	h.DB.Where("conversation_id = ?", m.ConversationID).Find(&members)
	targets := make([]string, 0, len(members))
	for _, mem := range members {
		targets = append(targets, mem.UserID)
	}
	data, _ := json.Marshal(gin.H{"type": "recall", "messageId": m.ID, "conversationId": m.ConversationID})
	h.Hub.Publish(targets, data)
	common.OK(c, gin.H{"ok": true})
}

// MarkRead 将会话标记为已读（更新当前用户的 last_read_at）。
func (h *Handler) MarkRead(c *gin.Context) {
	h.DB.Model(&models.ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", c.Param("cid"), middleware.CurrentUser(c)).
		Update("last_read_at", time.Now())
	common.OK(c, gin.H{"ok": true})
}

// inbound 是客户端通过 WS 上行的消息体。
type inbound struct {
	ConversationID string   `json:"conversationId"`
	Content        string   `json:"content"`
	Type           string   `json:"type"` // text / file / image
	Mentions       []string `json:"mentions"`
}

// ServeWS 升级为 WebSocket 连接（令牌通过 ?token= 传入）。
func (h *Handler) ServeWS(c *gin.Context) {
	uid, err := common.ParseToken(h.Secret, c.Query("token"))
	if err != nil {
		common.Fail(c, 401, "登录已失效")
		return
	}
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	client := &realtime.Client{Hub: h.Hub, Conn: conn, UserID: uid, Send: make(chan []byte, 32)}
	h.Hub.Register(client)
	go h.writePump(client)
	h.readPump(client)
}

func (h *Handler) readPump(c *realtime.Client) {
	defer func() {
		h.Hub.Unregister(c)
		c.Conn.Close()
	}()
	for {
		_, raw, err := c.Conn.ReadMessage()
		if err != nil {
			return
		}
		var in inbound
		if json.Unmarshal(raw, &in) != nil || in.Content == "" {
			continue
		}
		mtype := in.Type
		if mtype == "" {
			mtype = "text"
		}
		msg := models.Message{ConversationID: in.ConversationID, SenderID: c.UserID, Type: mtype, Content: in.Content}
		if h.DB.Create(&msg).Error != nil {
			continue
		}
		h.DB.Preload("Sender").First(&msg, "id = ?", msg.ID)

		var members []models.ConversationMember
		h.DB.Where("conversation_id = ?", in.ConversationID).Find(&members)
		targets := make([]string, 0, len(members))
		for _, m := range members {
			targets = append(targets, m.UserID)
		}
		data, _ := json.Marshal(gin.H{"type": "message", "message": msg, "at": time.Now()})
		h.Hub.Publish(targets, data)

		// @提醒：给被提及成员创建通知
		if h.Notify != nil {
			for _, mid := range in.Mentions {
				h.Notify.Create(mid, c.UserID, "mention", "有人在会话中提到你", in.Content, "/messages")
			}
		}
	}
}

func (h *Handler) writePump(c *realtime.Client) {
	for data := range c.Send {
		if c.Conn.WriteMessage(websocket.TextMessage, data) != nil {
			return
		}
	}
}
