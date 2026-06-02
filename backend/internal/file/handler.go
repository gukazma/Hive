package file

import (
	"path/filepath"

	"hive/internal/common"
	"hive/internal/middleware"
	"hive/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Handler struct {
	DB        *gorm.DB
	UploadDir string
}

// List 返回文件列表（可按 ?projectId= 过滤）。
func (h *Handler) List(c *gin.Context) {
	q := h.DB.Model(&models.File{}).Order("created_at DESC")
	if pid := c.Query("projectId"); pid != "" {
		q = q.Where("project_id = ?", pid)
	}
	var files []models.File
	q.Find(&files)
	common.OK(c, files)
}

// Upload 接收 multipart 文件，保存到本地并登记元数据。
func (h *Handler) Upload(c *gin.Context) {
	fh, err := c.FormFile("file")
	if err != nil {
		common.Fail(c, 400, "缺少文件")
		return
	}
	key := uuid.NewString() + filepath.Ext(fh.Filename)
	dst := filepath.Join(h.UploadDir, key)
	if err := c.SaveUploadedFile(fh, dst); err != nil {
		common.Fail(c, 500, "保存文件失败")
		return
	}
	var pid *string
	if v := c.PostForm("projectId"); v != "" {
		pid = &v
	}
	f := models.File{
		Name: fh.Filename, Size: fh.Size, Mime: fh.Header.Get("Content-Type"),
		StorageKey: key, OwnerID: middleware.CurrentUser(c), ProjectID: pid,
	}
	if err := h.DB.Create(&f).Error; err != nil {
		common.Fail(c, 500, "登记文件失败")
		return
	}
	common.Created(c, f)
}
