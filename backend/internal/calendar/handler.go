package calendar

import (
	"time"

	"hive/internal/common"
	"hive/internal/middleware"
	"hive/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{ DB *gorm.DB }

// Checkin 当日打卡（每天仅记一次）。
func (h *Handler) Checkin(c *gin.Context) {
	uid := middleware.CurrentUser(c)
	day := time.Now().Format("2006-01-02")
	var existing models.CheckIn
	if h.DB.Where("user_id = ? AND day = ?", uid, day).First(&existing).Error == nil {
		common.OK(c, existing)
		return
	}
	rec := models.CheckIn{UserID: uid, Day: day, CheckedAt: time.Now()}
	h.DB.Create(&rec)
	common.Created(c, rec)
}

// CheckinStatus 返回今日是否已打卡 + 本月打卡天数 + 最近记录。
func (h *Handler) CheckinStatus(c *gin.Context) {
	uid := middleware.CurrentUser(c)
	day := time.Now().Format("2006-01-02")
	month := time.Now().Format("2006-01")

	var today int64
	h.DB.Model(&models.CheckIn{}).Where("user_id = ? AND day = ?", uid, day).Count(&today)
	var monthCount int64
	h.DB.Model(&models.CheckIn{}).Where("user_id = ? AND day LIKE ?", uid, month+"%").Count(&monthCount)
	var recent []models.CheckIn
	h.DB.Where("user_id = ?", uid).Order("checked_at DESC").Limit(10).Find(&recent)

	common.OK(c, gin.H{"checkedToday": today > 0, "monthCount": monthCount, "recent": recent})
}

type eventReq struct {
	Title   string `json:"title" binding:"required"`
	Date    string `json:"date" binding:"required"`
	Content string `json:"content"`
}

// CreateEvent 新建日程。
func (h *Handler) CreateEvent(c *gin.Context) {
	var req eventReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	e := models.CalendarEvent{UserID: middleware.CurrentUser(c), Title: req.Title, Date: req.Date, Content: req.Content}
	if err := h.DB.Create(&e).Error; err != nil {
		common.Fail(c, 500, "创建日程失败")
		return
	}
	common.Created(c, e)
}

// ListEvents 返回当前用户日程，可按 ?month=YYYY-MM 过滤。
func (h *Handler) ListEvents(c *gin.Context) {
	q := h.DB.Where("user_id = ?", middleware.CurrentUser(c)).Order("date")
	if m := c.Query("month"); m != "" {
		q = q.Where("date LIKE ?", m+"%")
	}
	var events []models.CalendarEvent
	q.Find(&events)
	common.OK(c, events)
}
