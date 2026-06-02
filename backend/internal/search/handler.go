package search

import (
	"hive/internal/common"
	"hive/internal/middleware"
	"hive/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{ DB *gorm.DB }

type result struct {
	Type     string `json:"type"` // task / doc / project / message / user
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Link     string `json:"link"`
}

// Query 跨任务/文档/项目/消息/成员的全局搜索。
// 当前为关键词匹配；可平滑替换为向量(pgvector)语义检索。
func (h *Handler) Query(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		common.OK(c, []result{})
		return
	}
	uid := middleware.CurrentUser(c)
	like := "%" + q + "%"
	out := []result{}

	var tasks []models.Task
	h.DB.Where("title LIKE ?", like).Limit(6).Find(&tasks)
	for _, t := range tasks {
		out = append(out, result{"task", t.Title, "任务", "/projects/" + t.ProjectID})
	}

	var docs []models.Document
	h.DB.Where("title LIKE ? OR content_md LIKE ?", like, like).Limit(6).Find(&docs)
	for _, d := range docs {
		out = append(out, result{"doc", d.Title, "文档", "/docs"})
	}

	var projects []models.Project
	h.DB.Joins("JOIN project_members pm ON pm.project_id = projects.id").
		Where("pm.user_id = ? AND projects.name LIKE ?", uid, like).Limit(6).Find(&projects)
	for _, p := range projects {
		out = append(out, result{"project", p.Name, "项目", "/projects/" + p.ID})
	}

	var msgs []models.Message
	h.DB.Where("content LIKE ? AND conversation_id IN (?)", like,
		h.DB.Model(&models.ConversationMember{}).Select("conversation_id").Where("user_id = ?", uid)).
		Limit(6).Find(&msgs)
	for _, m := range msgs {
		out = append(out, result{"message", m.Content, "消息", "/messages"})
	}

	var users []models.User
	h.DB.Where("name LIKE ? OR email LIKE ?", like, like).Limit(6).Find(&users)
	for _, u := range users {
		out = append(out, result{"user", u.Name, u.Email, "/"})
	}

	common.OK(c, out)
}
