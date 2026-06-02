package realtime

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

const redisChannel = "hive:ws"

type envelope struct {
	Targets []string        `json:"targets"`
	Data    json.RawMessage `json:"data"`
}

// Client 表示一条 WebSocket 连接。字段导出以便 im 包驱动读写循环。
type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	UserID string
	Send   chan []byte
}

// Hub 维护本实例在线连接，并通过 Redis Pub/Sub 与其他实例同步。
type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[*Client]bool
	rdb     *redis.Client
}

func NewHub(rdb *redis.Client) *Hub {
	return &Hub{clients: make(map[string]map[*Client]bool), rdb: rdb}
}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[c.UserID] == nil {
		h.clients[c.UserID] = make(map[*Client]bool)
	}
	h.clients[c.UserID][c] = true
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if set, ok := h.clients[c.UserID]; ok {
		delete(set, c)
		if len(set) == 0 {
			delete(h.clients, c.UserID)
		}
	}
}

func (h *Hub) deliverLocal(targets []string, data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, uid := range targets {
		for c := range h.clients[uid] {
			select {
			case c.Send <- data:
			default:
			}
		}
	}
}

// Publish 把消息发布到 Redis，由所有实例各自下发。
func (h *Hub) Publish(targets []string, data []byte) {
	payload, _ := json.Marshal(envelope{Targets: targets, Data: data})
	if err := h.rdb.Publish(context.Background(), redisChannel, payload).Err(); err != nil {
		log.Printf("redis publish 失败: %v", err)
	}
}

// Run 订阅 Redis 频道并把消息下发到本地连接，应在独立 goroutine 中运行。
func (h *Hub) Run(ctx context.Context) {
	sub := h.rdb.Subscribe(ctx, redisChannel)
	for msg := range sub.Channel() {
		var env envelope
		if json.Unmarshal([]byte(msg.Payload), &env) == nil {
			h.deliverLocal(env.Targets, env.Data)
		}
	}
}
