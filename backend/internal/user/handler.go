package user

import (
	"hive/internal/common"
	"hive/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{ DB *gorm.DB }

// Search 按姓名/邮箱模糊查找用户，用于指派、邀请成员、发起会话等选择器。
func (h *Handler) Search(c *gin.Context) {
	q := h.DB.Model(&models.User{}).Order("name").Limit(20)
	if kw := c.Query("q"); kw != "" {
		like := "%" + kw + "%"
		q = q.Where("name LIKE ? OR email LIKE ?", like, like)
	}
	var users []models.User
	q.Find(&users)
	common.OK(c, users)
}
