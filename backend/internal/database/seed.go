package database

import (
	"log"

	"hive/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedAdmin 在系统中尚无任何用户时，按配置创建一个超级管理员。
// 类似 DooTask 的安装种子：默认 admin@hive.local / admin，首次登录后请尽快改密。
func SeedAdmin(db *gorm.DB, email, password string) {
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count > 0 {
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	admin := models.User{Name: "管理员", Email: email, PasswordHash: string(hash), Role: "admin", MustChangePwd: true}
	if err := db.Create(&admin).Error; err != nil {
		log.Printf("种子管理员创建失败: %v", err)
		return
	}
	log.Printf("已创建默认管理员 %s（初始密码请查看 ADMIN_PASSWORD，登录后请尽快修改）", email)
}

// ResetPassword 重置指定邮箱用户的密码，供 CLI 子命令使用。
func ResetPassword(db *gorm.DB, email, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return db.Model(&models.User{}).Where("email = ?", email).
		Updates(map[string]any{"password_hash": string(hash), "must_change_pwd": false}).Error
}
