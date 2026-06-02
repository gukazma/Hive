package doc

import (
	"hive/internal/common"
	"hive/internal/middleware"
	"hive/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{ DB *gorm.DB }

// List 返回文档列表（可按 ?projectId= 过滤）。
func (h *Handler) List(c *gin.Context) {
	q := h.DB.Model(&models.Document{}).Order("updated_at DESC")
	if pid := c.Query("projectId"); pid != "" {
		q = q.Where("project_id = ?", pid)
	}
	var docs []models.Document
	q.Find(&docs)
	common.OK(c, docs)
}

type createReq struct {
	Title     string  `json:"title" binding:"required"`
	Kind      string  `json:"kind"`
	ProjectID *string `json:"projectId"`
}

// Create 新建文档或白板。
func (h *Handler) Create(c *gin.Context) {
	var req createReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	kind := req.Kind
	if kind == "" {
		kind = "doc"
	}
	d := models.Document{Title: req.Title, Kind: kind, ProjectID: req.ProjectID, CreatedBy: middleware.CurrentUser(c)}
	if err := h.DB.Create(&d).Error; err != nil {
		common.Fail(c, 500, "创建文档失败")
		return
	}
	common.Created(c, d)
}

// Get 返回文档详情。
func (h *Handler) Get(c *gin.Context) {
	var d models.Document
	if err := h.DB.First(&d, "id = ?", c.Param("did")).Error; err != nil {
		common.Fail(c, 404, "文档不存在")
		return
	}
	common.OK(c, d)
}

type updateReq struct {
	Title       *string `json:"title"`
	ContentJSON *string `json:"contentJson"`
	ContentMD   *string `json:"contentMd"`
}

// Update 保存文档内容/标题。
func (h *Handler) Update(c *gin.Context) {
	var req updateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	fields := map[string]any{}
	if req.Title != nil {
		fields["title"] = *req.Title
	}
	if req.ContentJSON != nil {
		fields["content_json"] = *req.ContentJSON
	}
	if req.ContentMD != nil {
		fields["content_md"] = *req.ContentMD
	}
	h.DB.Model(&models.Document{}).Where("id = ?", c.Param("did")).Updates(fields)
	var d models.Document
	h.DB.First(&d, "id = ?", c.Param("did"))
	common.OK(c, d)
}
