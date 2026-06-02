package approval

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
	Title      string `json:"title" binding:"required"`
	Type       string `json:"type"`
	Content    string `json:"content"`
	ApproverID string `json:"approverId" binding:"required"`
}

// Create 发起一条审批，并通知审批人。
func (h *Handler) Create(c *gin.Context) {
	var req createReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	typ := req.Type
	if typ == "" {
		typ = "general"
	}
	a := models.Approval{
		Title: req.Title, Type: typ, Content: req.Content,
		ApplicantID: middleware.CurrentUser(c), ApproverID: req.ApproverID, Status: "pending",
	}
	if err := h.DB.Create(&a).Error; err != nil {
		common.Fail(c, 500, "提交失败")
		return
	}
	if h.Notify != nil {
		h.Notify.Create(req.ApproverID, a.ApplicantID, "approval", "有一条审批待处理", req.Title, "/approvals")
	}
	common.Created(c, a)
}

// List 返回审批列表：?box=mine（我发起）| todo（待我审批）。
func (h *Handler) List(c *gin.Context) {
	uid := middleware.CurrentUser(c)
	q := h.DB.Preload("Applicant").Preload("Approver").Order("created_at DESC")
	switch c.Query("box") {
	case "todo":
		q = q.Where("approver_id = ? AND status = ?", uid, "pending")
	default:
		q = q.Where("applicant_id = ?", uid)
	}
	var list []models.Approval
	q.Find(&list)
	common.OK(c, list)
}

type decideReq struct {
	Action  string `json:"action" binding:"required,oneof=approve reject"`
	Comment string `json:"comment"`
}

// Decide 审批人通过/驳回，并通知申请人。
func (h *Handler) Decide(c *gin.Context) {
	var req decideReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	uid := middleware.CurrentUser(c)
	var a models.Approval
	if err := h.DB.First(&a, "id = ?", c.Param("aid")).Error; err != nil {
		common.Fail(c, 404, "审批不存在")
		return
	}
	if a.ApproverID != uid {
		common.Fail(c, 403, "无权处理该审批")
		return
	}
	status := "approved"
	if req.Action == "reject" {
		status = "rejected"
	}
	h.DB.Model(&a).Updates(map[string]any{"status": status, "comment": req.Comment, "updated_at": time.Now()})
	if h.Notify != nil {
		label := map[string]string{"approved": "已通过", "rejected": "已驳回"}[status]
		h.Notify.Create(a.ApplicantID, uid, "approval", "你的审批"+label, a.Title, "/approvals")
	}
	common.OK(c, gin.H{"ok": true})
}
