package appstore

import (
	"hive/internal/common"
	"hive/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{ DB *gorm.DB }

type app struct {
	Key      string `json:"key"`
	Name     string `json:"name"`
	Desc     string `json:"desc"`
	Category string `json:"category"`
	Icon     string `json:"icon"`
}

// catalog 是内置应用目录（可被外部插件清单扩展）。
var catalog = []app{
	{"gantt-pro", "高级甘特", "关键路径、依赖与基线对比", "项目", "gantt"},
	{"gitlab", "GitLab 集成", "提交与合并请求关联任务", "研发", "git"},
	{"webhook-bot", "Webhook 机器人", "事件推送到外部系统", "自动化", "robot"},
	{"okr", "OKR 目标", "目标与关键结果管理", "管理", "aim"},
	{"time-track", "工时统计", "任务计时与工时报表", "效率", "clock"},
	{"whiteboard", "在线白板", "实时协作画板与头脑风暴", "协作", "board"},
	{"calendar-sync", "日历同步", "与第三方日历双向同步", "效率", "calendar"},
	{"ai-plus", "AI 增强包", "更强的拆解、摘要与语义检索", "AI", "ai"},
}

// List 返回应用目录及其安装状态。
func (h *Handler) List(c *gin.Context) {
	var installs []models.AppInstall
	h.DB.Find(&installs)
	set := map[string]bool{}
	for _, i := range installs {
		set[i.AppKey] = true
	}
	out := make([]gin.H, 0, len(catalog))
	for _, a := range catalog {
		out = append(out, gin.H{"key": a.Key, "name": a.Name, "desc": a.Desc, "category": a.Category, "icon": a.Icon, "installed": set[a.Key]})
	}
	common.OK(c, out)
}

// Install 安装应用。
func (h *Handler) Install(c *gin.Context) {
	h.DB.FirstOrCreate(&models.AppInstall{}, models.AppInstall{AppKey: c.Param("key")})
	common.OK(c, gin.H{"ok": true})
}

// Uninstall 卸载应用。
func (h *Handler) Uninstall(c *gin.Context) {
	h.DB.Where("app_key = ?", c.Param("key")).Delete(&models.AppInstall{})
	common.OK(c, gin.H{"ok": true})
}
