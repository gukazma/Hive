package task

import (
	"time"

	"hive/internal/common"
	"hive/internal/middleware"
	"hive/internal/models"
	"hive/internal/notify"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	DB     *gorm.DB
	Notify *notify.Service
}

type createReq struct {
	Title      string     `json:"title" binding:"required"`
	ColumnID   string     `json:"columnId" binding:"required"`
	Priority   string     `json:"priority"`
	AssigneeID *string    `json:"assigneeId"`
	ParentID   *string    `json:"parentId"`
	DueAt      *time.Time `json:"dueAt"`
}

type updateReq struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	Priority    *string    `json:"priority"`
	Status      *string    `json:"status"`
	AssigneeID  *string    `json:"assigneeId"`
	ColumnID    *string    `json:"columnId"`
	DueAt       *time.Time `json:"dueAt"`
}

type moveReq struct {
	ColumnID string  `json:"columnId" binding:"required"`
	Sort     float64 `json:"sort"`
}

// cardDTO 在任务基础上附带看板卡片所需的统计。
type cardDTO struct {
	models.Task
	SubTotal     int64 `json:"subTotal"`
	SubDone      int64 `json:"subDone"`
	CommentCount int64 `json:"commentCount"`
}

// List 返回项目下的顶层任务（含负责人、子任务进度、评论数）。
func (h *Handler) List(c *gin.Context) {
	var tasks []models.Task
	h.DB.Preload("Assignee").Preload("Tags").
		Where("project_id = ? AND parent_id IS NULL AND archived = ?", c.Param("id"), false).
		Order("sort").Find(&tasks)

	cards := make([]cardDTO, 0, len(tasks))
	for _, t := range tasks {
		var subTotal, subDone, cc int64
		h.DB.Model(&models.Task{}).Where("parent_id = ?", t.ID).Count(&subTotal)
		h.DB.Model(&models.Task{}).Where("parent_id = ? AND status = ?", t.ID, "done").Count(&subDone)
		h.DB.Model(&models.TaskComment{}).Where("task_id = ?", t.ID).Count(&cc)
		cards = append(cards, cardDTO{Task: t, SubTotal: subTotal, SubDone: subDone, CommentCount: cc})
	}
	common.OK(c, cards)
}

// Create 在指定项目新建任务。
func (h *Handler) Create(c *gin.Context) {
	var req createReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	priority := req.Priority
	if priority == "" {
		priority = "mid"
	}
	t := models.Task{
		ProjectID: c.Param("id"), ColumnID: req.ColumnID, Title: req.Title,
		Priority: priority, AssigneeID: req.AssigneeID, ParentID: req.ParentID, DueAt: req.DueAt,
		Sort: float64(time.Now().UnixMilli()),
	}
	if err := h.DB.Create(&t).Error; err != nil {
		common.Fail(c, 500, "创建任务失败")
		return
	}
	h.DB.Preload("Assignee").First(&t, "id = ?", t.ID)
	common.Created(c, t)
}

// Get 返回任务详情（负责人、子任务、评论）。
func (h *Handler) Get(c *gin.Context) {
	var t models.Task
	err := h.DB.Preload("Assignee").Preload("Subtasks").Preload("Tags").
		Preload("Comments", func(db *gorm.DB) *gorm.DB { return db.Order("created_at").Preload("User") }).
		First(&t, "id = ?", c.Param("tid")).Error
	if err != nil {
		common.Fail(c, 404, "任务不存在")
		return
	}
	common.OK(c, t)
}

// Update 局部更新任务字段。
func (h *Handler) Update(c *gin.Context) {
	var req updateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	fields := map[string]any{}
	if req.Title != nil {
		fields["title"] = *req.Title
	}
	if req.Description != nil {
		fields["description"] = *req.Description
	}
	if req.Priority != nil {
		fields["priority"] = *req.Priority
	}
	if req.Status != nil {
		fields["status"] = *req.Status
	}
	if req.AssigneeID != nil {
		fields["assignee_id"] = *req.AssigneeID
	}
	if req.ColumnID != nil {
		fields["column_id"] = *req.ColumnID
	}
	if req.DueAt != nil {
		fields["due_at"] = *req.DueAt
	}
	if err := h.DB.Model(&models.Task{}).Where("id = ?", c.Param("tid")).Updates(fields).Error; err != nil {
		common.Fail(c, 500, "更新失败")
		return
	}
	var t models.Task
	h.DB.Preload("Assignee").First(&t, "id = ?", c.Param("tid"))
	if h.Notify != nil && req.AssigneeID != nil && *req.AssigneeID != "" {
		h.Notify.Create(*req.AssigneeID, middleware.CurrentUser(c), "assigned", "你被指派了任务", t.Title, "/projects/"+t.ProjectID)
	}
	common.OK(c, t)
}

// Move 移动任务到目标列并更新排序。
func (h *Handler) Move(c *gin.Context) {
	var req moveReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	h.DB.Model(&models.Task{}).Where("id = ?", c.Param("tid")).
		Updates(map[string]any{"column_id": req.ColumnID, "sort": req.Sort})
	common.OK(c, gin.H{"ok": true})
}

// Archive 归档任务（从看板隐藏，不删除）。
func (h *Handler) Archive(c *gin.Context) {
	h.DB.Model(&models.Task{}).Where("id = ?", c.Param("tid")).Update("archived", true)
	common.OK(c, gin.H{"ok": true})
}

// Delete 删除任务及其子任务。
func (h *Handler) Delete(c *gin.Context) {
	tid := c.Param("tid")
	h.DB.Where("id = ? OR parent_id = ?", tid, tid).Delete(&models.Task{})
	common.OK(c, gin.H{"ok": true})
}

type subtaskReq struct {
	Title string `json:"title" binding:"required"`
}

// AddSubtask 在父任务下创建子任务，继承其项目与所在列。
func (h *Handler) AddSubtask(c *gin.Context) {
	var req subtaskReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	tid := c.Param("tid")
	var parent models.Task
	if err := h.DB.First(&parent, "id = ?", tid).Error; err != nil {
		common.Fail(c, 404, "父任务不存在")
		return
	}
	child := models.Task{
		ProjectID: parent.ProjectID, ColumnID: parent.ColumnID, ParentID: &tid,
		Title: req.Title, Priority: "mid", Sort: float64(time.Now().UnixMilli()),
	}
	if err := h.DB.Create(&child).Error; err != nil {
		common.Fail(c, 500, "创建子任务失败")
		return
	}
	common.Created(c, child)
}

type tagIDReq struct {
	TagID string `json:"tagId" binding:"required"`
}

// AddTag 给任务关联标签。
func (h *Handler) AddTag(c *gin.Context) {
	var req tagIDReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	h.DB.Model(&models.Task{Base: models.Base{ID: c.Param("tid")}}).
		Association("Tags").Append(&models.Tag{Base: models.Base{ID: req.TagID}})
	common.OK(c, gin.H{"ok": true})
}

// RemoveTag 移除任务上的标签。
func (h *Handler) RemoveTag(c *gin.Context) {
	h.DB.Model(&models.Task{Base: models.Base{ID: c.Param("tid")}}).
		Association("Tags").Delete(&models.Tag{Base: models.Base{ID: c.Param("tagId")}})
	common.OK(c, gin.H{"ok": true})
}

type commentReq struct {
	Content string `json:"content" binding:"required"`
}

// AddComment 给任务添加评论。
func (h *Handler) AddComment(c *gin.Context) {
	var req commentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	cm := models.TaskComment{TaskID: c.Param("tid"), UserID: middleware.CurrentUser(c), Content: req.Content}
	if err := h.DB.Create(&cm).Error; err != nil {
		common.Fail(c, 500, "评论失败")
		return
	}
	h.DB.Preload("User").First(&cm, "id = ?", cm.ID)
	if h.Notify != nil {
		var t models.Task
		if h.DB.First(&t, "id = ?", c.Param("tid")).Error == nil && t.AssigneeID != nil {
			h.Notify.Create(*t.AssigneeID, middleware.CurrentUser(c), "comment", "你的任务有新评论", req.Content, "/projects/"+t.ProjectID)
		}
	}
	common.Created(c, cm)
}
