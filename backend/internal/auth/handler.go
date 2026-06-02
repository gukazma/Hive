package auth

import (
	"hive/internal/common"
	"hive/internal/middleware"
	"hive/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Handler struct {
	DB     *gorm.DB
	Secret string
}

type registerReq struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type loginReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) Register(c *gin.Context) {
	var req registerReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	var count int64
	h.DB.Model(&models.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		common.Fail(c, 409, "邮箱已被注册")
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	user := models.User{Name: req.Name, Email: req.Email, PasswordHash: string(hash)}
	if err := h.DB.Create(&user).Error; err != nil {
		common.Fail(c, 500, "创建用户失败")
		return
	}
	h.issueToken(c, &user)
}

func (h *Handler) Login(c *gin.Context) {
	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		common.Fail(c, 401, "邮箱或密码错误")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		common.Fail(c, 401, "邮箱或密码错误")
		return
	}
	h.issueToken(c, &user)
}

func (h *Handler) Me(c *gin.Context) {
	var user models.User
	if err := h.DB.First(&user, "id = ?", middleware.CurrentUser(c)).Error; err != nil {
		common.Fail(c, 404, "用户不存在")
		return
	}
	common.OK(c, user)
}

type changePwdReq struct {
	OldPassword string `json:"oldPassword" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=6"`
}

// ChangePassword 校验原密码后修改为新密码，并清除"需改密"标记。
func (h *Handler) ChangePassword(c *gin.Context) {
	var req changePwdReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	var user models.User
	if err := h.DB.First(&user, "id = ?", middleware.CurrentUser(c)).Error; err != nil {
		common.Fail(c, 404, "用户不存在")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)) != nil {
		common.Fail(c, 400, "原密码错误")
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	h.DB.Model(&user).Updates(map[string]any{"password_hash": string(hash), "must_change_pwd": false})
	common.OK(c, gin.H{"ok": true})
}

type profileReq struct {
	Name   *string `json:"name"`
	Avatar *string `json:"avatar"`
}

// UpdateProfile 更新当前用户的姓名/头像。
func (h *Handler) UpdateProfile(c *gin.Context) {
	var req profileReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	fields := map[string]any{}
	if req.Name != nil {
		fields["name"] = *req.Name
	}
	if req.Avatar != nil {
		fields["avatar"] = *req.Avatar
	}
	h.DB.Model(&models.User{}).Where("id = ?", middleware.CurrentUser(c)).Updates(fields)
	var user models.User
	h.DB.First(&user, "id = ?", middleware.CurrentUser(c))
	common.OK(c, user)
}

func (h *Handler) issueToken(c *gin.Context, user *models.User) {
	token, err := common.GenerateToken(h.Secret, user.ID)
	if err != nil {
		common.Fail(c, 500, "签发令牌失败")
		return
	}
	common.OK(c, gin.H{"token": token, "user": user})
}
