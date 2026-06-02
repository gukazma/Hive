package database

import "github.com/redis/go-redis/v9"

// NewRedis 创建 Redis 客户端，用于 WebSocket 跨实例消息广播与缓存。
func NewRedis(addr string) *redis.Client {
	return redis.NewClient(&redis.Options{Addr: addr})
}
