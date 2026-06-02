package notify

import (
	"encoding/json"

	"hive/internal/models"
	"hive/internal/realtime"

	"gorm.io/gorm"
)

// Service 负责创建站内通知并通过 WebSocket 实时推送。
type Service struct {
	DB  *gorm.DB
	Hub *realtime.Hub
}

func New(db *gorm.DB, hub *realtime.Hub) *Service {
	return &Service{DB: db, Hub: hub}
}

// Create 写入一条通知并推送给接收者（actor 与接收者相同则跳过，避免自我通知）。
func (s *Service) Create(userID, actorID, typ, title, body, link string) {
	if userID == "" || userID == actorID {
		return
	}
	n := models.Notification{UserID: userID, ActorID: actorID, Type: typ, Title: title, Body: body, Link: link}
	if s.DB.Create(&n).Error != nil {
		return
	}
	if s.Hub != nil {
		data, _ := json.Marshal(map[string]any{"type": "notification", "notification": n})
		s.Hub.Publish([]string{userID}, data)
	}
}
