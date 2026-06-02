package database

import (
	"log"

	"hive/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Connect 建立 PostgreSQL 连接。
func Connect(dsn string) *gorm.DB {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}
	return db
}

// Migrate 自动迁移全部模型表结构。
func Migrate(db *gorm.DB) {
	if err := db.AutoMigrate(models.All()...); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}
}
