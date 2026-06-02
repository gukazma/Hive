package middleware

import (
	"strings"

	"hive/internal/common"
	"hive/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Auth 校验 Authorization: Bearer <token>，并把用户 ID 写入上下文键 "uid"。
func Auth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			common.Fail(c, 401, "未登录")
			c.Abort()
			return
		}
		uid, err := common.ParseToken(secret, strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			common.Fail(c, 401, "登录已失效")
			c.Abort()
			return
		}
		c.Set("uid", uid)
		c.Next()
	}
}

// CurrentUser 从上下文取出当前用户 ID。
func CurrentUser(c *gin.Context) string {
	if v, ok := c.Get("uid"); ok {
		return v.(string)
	}
	return ""
}

// AdminOnly 要求当前用户的系统角色为 admin，否则 403。需在 Auth 之后使用。
func AdminOnly(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var user models.User
		if err := db.First(&user, "id = ?", CurrentUser(c)).Error; err != nil || user.Role != "admin" {
			common.Fail(c, 403, "需要管理员权限")
			c.Abort()
			return
		}
		c.Next()
	}
}
