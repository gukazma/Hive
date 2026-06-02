package config

import (
	"os"

	"github.com/joho/godotenv"
)

// Config 保存服务运行所需的全部配置项。
type Config struct {
	Port          string
	DatabaseURL   string
	RedisAddr     string
	JWTSecret     string
	CORSOrigin    string
	AdminEmail    string
	AdminPassword string
	AIKey         string
}

// Load 从 .env（若存在）与环境变量读取配置，缺省时回退到开发默认值。
func Load() *Config {
	_ = godotenv.Load()
	return &Config{
		Port:        env("PORT", "8080"),
		DatabaseURL: env("DATABASE_URL", "host=localhost user=hive password=hive dbname=hive port=5432 sslmode=disable TimeZone=Asia/Shanghai"),
		RedisAddr:   env("REDIS_ADDR", "localhost:6379"),
		JWTSecret:     env("JWT_SECRET", "dev-secret-change-me"),
		CORSOrigin:    env("CORS_ORIGIN", "http://localhost:5173"),
		AdminEmail:    env("ADMIN_EMAIL", "admin@hive.local"),
		AdminPassword: env("ADMIN_PASSWORD", "admin"),
		AIKey:         env("AI_API_KEY", ""),
	}
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
