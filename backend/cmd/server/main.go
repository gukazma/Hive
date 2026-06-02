package main

import (
	"context"
	"log"
	"os"

	"hive/internal/config"
	"hive/internal/database"
	"hive/internal/realtime"
	"hive/internal/router"
)

func main() {
	cfg := config.Load()

	db := database.Connect(cfg.DatabaseURL)
	database.Migrate(db)

	// CLI 子命令：重置密码  ——  用法: hive repassword <email> <newPassword>
	if len(os.Args) >= 4 && os.Args[1] == "repassword" {
		if err := database.ResetPassword(db, os.Args[2], os.Args[3]); err != nil {
			log.Fatalf("重置密码失败: %v", err)
		}
		log.Printf("已重置 %s 的密码", os.Args[2])
		return
	}

	// 首次启动若无用户，种子一个超级管理员
	database.SeedAdmin(db, cfg.AdminEmail, cfg.AdminPassword)

	rdb := database.NewRedis(cfg.RedisAddr)

	hub := realtime.NewHub(rdb)
	go hub.Run(context.Background())

	r := router.New(db, rdb, cfg, hub)
	log.Printf("Hive 后端已启动，监听 :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}
