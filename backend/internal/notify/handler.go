package notify

import (
	"hive/internal/common"
	"hive/internal/middleware"
	"hive/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{ DB *gorm.DB }

// List 返回当前用户最近的通知。
func (h *Handler) List(c *gin.Context) {
	var ns []models.Notification
	h.DB.Where("user_id = ?", middleware.CurrentUser(c)).Order("created_at DESC").Limit(50).Find(&ns)
	common.OK(c, ns)
}

// UnreadCount 返回未读数量。
func (h *Handler) UnreadCount(c *gin.Context) {
	var n int64
	h.DB.Model(&models.Notification{}).Where("user_id = ? AND read = ?", middleware.CurrentUser(c), false).Count(&n)
	common.OK(c, gin.H{"count": n})
}

// MarkRead 标记单条已读。
func (h *Handler) MarkRead(c *gin.Context) {
	h.DB.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", c.Param("nid"), middleware.CurrentUser(c)).
		Update("read", true)
	common.OK(c, gin.H{"ok": true})
}

// MarkAllRead 全部标记已读。
func (h *Handler) MarkAllRead(c *gin.Context) {
	h.DB.Model(&models.Notification{}).
		Where("user_id = ? AND read = ?", middleware.CurrentUser(c), false).
		Update("read", true)
	common.OK(c, gin.H{"ok": true})
}
