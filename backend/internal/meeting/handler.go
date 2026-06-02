package meeting

import (
	"strings"

	"hive/internal/common"
	"hive/internal/middleware"
	"hive/internal/models"

	"github.com/google/uuid"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{ DB *gorm.DB }

type createReq struct {
	Title string `json:"title" binding:"required"`
}

// Create 创建一个视频会议室（房间名用于拼接 Jitsi 地址）。
func (h *Handler) Create(c *gin.Context) {
	var req createReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	room := "hive-" + strings.ReplaceAll(uuid.NewString(), "-", "")[:12]
	m := models.Meeting{Title: req.Title, Room: room, HostID: middleware.CurrentUser(c)}
	if err := h.DB.Create(&m).Error; err != nil {
		common.Fail(c, 500, "创建会议失败")
		return
	}
	h.DB.Preload("Host").First(&m, "id = ?", m.ID)
	common.Created(c, m)
}

// List 返回最近的会议。
func (h *Handler) List(c *gin.Context) {
	var list []models.Meeting
	h.DB.Preload("Host").Order("created_at DESC").Limit(30).Find(&list)
	common.OK(c, list)
}
