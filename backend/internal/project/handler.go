package project

import (
	"hive/internal/common"
	"hive/internal/middleware"
	"hive/internal/models"
	"hive/internal/notify"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	DB     *gorm.DB
	Notify *notify.Service
}

type createReq struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Color       string `json:"color"`
}

var defaultColumns = []string{"待办", "进行中", "已完成"}

// List 返回当前用户参与的全部项目。
func (h *Handler) List(c *gin.Context) {
	uid := middleware.CurrentUser(c)
	var projects []models.Project
	h.DB.Joins("JOIN project_members pm ON pm.project_id = projects.id").
		Where("pm.user_id = ? AND projects.archived = ?", uid, false).
		Order("projects.created_at DESC").Find(&projects)
	common.OK(c, projects)
}

// Create 创建项目，自动添加创建者为 owner 并生成默认看板列。
func (h *Handler) Create(c *gin.Context) {
	var req createReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	uid := middleware.CurrentUser(c)
	color := req.Color
	if color == "" {
		color = "#4F46E5"
	}
	p := models.Project{Name: req.Name, Description: req.Description, Color: color, OwnerID: uid}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&p).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.ProjectMember{ProjectID: p.ID, UserID: uid, Role: "owner"}).Error; err != nil {
			return err
		}
		for i, name := range defaultColumns {
			if err := tx.Create(&models.TaskColumn{ProjectID: p.ID, Name: name, Sort: i}).Error; err != nil {
				return err
			}
		}
		// 自动创建项目群会话并加入创建者
		conv := models.Conversation{Type: "group", Name: p.Name, ProjectID: &p.ID}
		if err := tx.Create(&conv).Error; err != nil {
			return err
		}
		return tx.Create(&models.ConversationMember{ConversationID: conv.ID, UserID: uid}).Error
	})
	if err != nil {
		common.Fail(c, 500, "创建项目失败")
		return
	}
	common.Created(c, p)
}

// Get 返回项目详情（含成员）。
func (h *Handler) Get(c *gin.Context) {
	var p models.Project
	if err := h.DB.First(&p, "id = ?", c.Param("id")).Error; err != nil {
		common.Fail(c, 404, "项目不存在")
		return
	}
	var members []models.ProjectMember
	h.DB.Preload("User").Where("project_id = ?", p.ID).Find(&members)
	common.OK(c, gin.H{"project": p, "members": members})
}

type addMemberReq struct {
	UserID string `json:"userId" binding:"required"`
	Role   string `json:"role"`
}

// AddMember 邀请用户加入项目，并同步加入项目群会话。
func (h *Handler) AddMember(c *gin.Context) {
	var req addMemberReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	pid := c.Param("id")
	role := req.Role
	if role == "" {
		role = "member"
	}
	h.DB.Where(models.ProjectMember{ProjectID: pid, UserID: req.UserID}).
		Assign(models.ProjectMember{Role: role}).
		FirstOrCreate(&models.ProjectMember{})

	var conv models.Conversation
	if h.DB.Where("project_id = ?", pid).First(&conv).Error == nil {
		h.DB.FirstOrCreate(&models.ConversationMember{}, models.ConversationMember{ConversationID: conv.ID, UserID: req.UserID})
	}
	if h.Notify != nil {
		var p models.Project
		h.DB.First(&p, "id = ?", pid)
		h.Notify.Create(req.UserID, middleware.CurrentUser(c), "member", "你被加入了项目", p.Name, "/projects/"+pid)
	}
	common.OK(c, gin.H{"ok": true})
}

// Columns 返回项目的看板列。
func (h *Handler) Columns(c *gin.Context) {
	var cols []models.TaskColumn
	h.DB.Where("project_id = ?", c.Param("id")).Order("sort").Find(&cols)
	common.OK(c, cols)
}

// Tags 返回项目的标签。
func (h *Handler) Tags(c *gin.Context) {
	var tags []models.Tag
	h.DB.Where("project_id = ?", c.Param("id")).Order("created_at").Find(&tags)
	common.OK(c, tags)
}

type tagReq struct {
	Name  string `json:"name" binding:"required"`
	Color string `json:"color"`
}

// CreateTag 在项目下新建标签。
func (h *Handler) CreateTag(c *gin.Context) {
	var req tagReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	color := req.Color
	if color == "" {
		color = "#4F46E5"
	}
	t := models.Tag{ProjectID: c.Param("id"), Name: req.Name, Color: color}
	if err := h.DB.Create(&t).Error; err != nil {
		common.Fail(c, 500, "创建标签失败")
		return
	}
	common.Created(c, t)
}

type columnReq struct {
	Name string `json:"name" binding:"required"`
}

// CreateColumn 在项目末尾新增一个看板列。
func (h *Handler) CreateColumn(c *gin.Context) {
	var req columnReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	var maxSort int
	h.DB.Model(&models.TaskColumn{}).Where("project_id = ?", c.Param("id")).
		Select("COALESCE(MAX(sort),0)").Scan(&maxSort)
	col := models.TaskColumn{ProjectID: c.Param("id"), Name: req.Name, Sort: maxSort + 1}
	if err := h.DB.Create(&col).Error; err != nil {
		common.Fail(c, 500, "创建列失败")
		return
	}
	common.Created(c, col)
}
