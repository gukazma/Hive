package admin

import (
	"hive/internal/common"
	"hive/internal/middleware"
	"hive/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{ DB *gorm.DB }

// Stats 返回全站概览统计。
func (h *Handler) Stats(c *gin.Context) {
	var users, projects, tasks int64
	h.DB.Model(&models.User{}).Count(&users)
	h.DB.Model(&models.Project{}).Count(&projects)
	h.DB.Model(&models.Task{}).Count(&tasks)
	common.OK(c, gin.H{"users": users, "projects": projects, "tasks": tasks})
}

// Users 返回全部用户。
func (h *Handler) Users(c *gin.Context) {
	var users []models.User
	h.DB.Order("created_at").Find(&users)
	common.OK(c, users)
}

type roleReq struct {
	Role string `json:"role" binding:"required,oneof=admin member"`
}

// SetRole 修改用户的系统角色。
func (h *Handler) SetRole(c *gin.Context) {
	var req roleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	h.DB.Model(&models.User{}).Where("id = ?", c.Param("uid")).Update("role", req.Role)
	common.OK(c, gin.H{"ok": true})
}

// DeleteUser 删除用户（不允许删除自己）。
func (h *Handler) DeleteUser(c *gin.Context) {
	if c.Param("uid") == middleware.CurrentUser(c) {
		common.Fail(c, 400, "不能删除自己")
		return
	}
	h.DB.Delete(&models.User{}, "id = ?", c.Param("uid"))
	common.OK(c, gin.H{"ok": true})
}

// Projects 返回全部项目（管理员视角，不限成员）。
func (h *Handler) Projects(c *gin.Context) {
	var projects []models.Project
	h.DB.Order("created_at DESC").Find(&projects)
	common.OK(c, projects)
}

// Departments 返回全部部门。
func (h *Handler) Departments(c *gin.Context) {
	var depts []models.Department
	h.DB.Order("created_at").Find(&depts)
	common.OK(c, depts)
}

type deptReq struct {
	Name     string  `json:"name" binding:"required"`
	ParentID *string `json:"parentId"`
}

// CreateDepartment 新建部门。
func (h *Handler) CreateDepartment(c *gin.Context) {
	var req deptReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	d := models.Department{Name: req.Name, ParentID: req.ParentID}
	h.DB.Create(&d)
	common.Created(c, d)
}

// DeleteDepartment 删除部门，并清空其下成员的部门归属。
func (h *Handler) DeleteDepartment(c *gin.Context) {
	did := c.Param("did")
	h.DB.Delete(&models.Department{}, "id = ?", did)
	h.DB.Model(&models.User{}).Where("department_id = ?", did).Update("department_id", nil)
	common.OK(c, gin.H{"ok": true})
}

type userDeptReq struct {
	DepartmentID *string `json:"departmentId"`
}

// SetUserDepartment 设置用户所属部门。
func (h *Handler) SetUserDepartment(c *gin.Context) {
	var req userDeptReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	h.DB.Model(&models.User{}).Where("id = ?", c.Param("uid")).Update("department_id", req.DepartmentID)
	common.OK(c, gin.H{"ok": true})
}
