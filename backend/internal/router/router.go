package router

import (
	"os"
	"time"

	"hive/internal/admin"
	"hive/internal/ai"
	"hive/internal/appstore"
	"hive/internal/approval"
	"hive/internal/auth"
	"hive/internal/calendar"
	"hive/internal/common"
	"hive/internal/config"
	"hive/internal/doc"
	"hive/internal/file"
	"hive/internal/im"
	"hive/internal/meeting"
	"hive/internal/middleware"
	"hive/internal/notify"
	"hive/internal/project"
	"hive/internal/realtime"
	"hive/internal/search"
	"hive/internal/task"
	"hive/internal/user"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const uploadDir = "uploads"

// New 装配全部路由并返回 Gin 引擎。
func New(db *gorm.DB, rdb *redis.Client, cfg *config.Config, hub *realtime.Hub) *gin.Engine {
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.CORSOrigin},
		AllowMethods:     []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	_ = os.MkdirAll(uploadDir, 0o755)

	notifySvc := notify.New(db, hub)

	authH := &auth.Handler{DB: db, Secret: cfg.JWTSecret}
	projH := &project.Handler{DB: db, Notify: notifySvc}
	taskH := &task.Handler{DB: db, Notify: notifySvc}
	imH := &im.Handler{DB: db, Hub: hub, Notify: notifySvc, Secret: cfg.JWTSecret}
	notifH := &notify.Handler{DB: db}
	docH := &doc.Handler{DB: db}
	fileH := &file.Handler{DB: db, UploadDir: uploadDir}
	adminH := &admin.Handler{DB: db}
	userH := &user.Handler{DB: db}
	aiH := &ai.Handler{Key: cfg.AIKey}
	approvalH := &approval.Handler{DB: db, Notify: notifySvc}
	calH := &calendar.Handler{DB: db}
	searchH := &search.Handler{DB: db}
	appH := &appstore.Handler{DB: db}
	meetingH := &meeting.Handler{DB: db}

	r.Static("/uploads", uploadDir)

	api := r.Group("/api")
	api.GET("/health", func(c *gin.Context) { common.OK(c, gin.H{"status": "ok"}) })

	api.POST("/auth/register", authH.Register)
	api.POST("/auth/login", authH.Login)
	api.GET("/ws", imH.ServeWS) // 鉴权通过 ?token= 进行

	a := api.Group("")
	a.Use(middleware.Auth(cfg.JWTSecret))
	{
		a.GET("/auth/me", authH.Me)
		a.PATCH("/auth/profile", authH.UpdateProfile)
		a.POST("/auth/change-password", authH.ChangePassword)

		a.GET("/users", userH.Search)
		a.GET("/search", searchH.Query)

		a.GET("/projects", projH.List)
		a.POST("/projects", projH.Create)
		a.GET("/projects/:id", projH.Get)
		a.POST("/projects/:id/members", projH.AddMember)
		a.GET("/projects/:id/columns", projH.Columns)
		a.POST("/projects/:id/columns", projH.CreateColumn)
		a.GET("/projects/:id/tags", projH.Tags)
		a.POST("/projects/:id/tags", projH.CreateTag)
		a.GET("/projects/:id/tasks", taskH.List)
		a.POST("/projects/:id/tasks", taskH.Create)

		a.GET("/tasks/:tid", taskH.Get)
		a.PATCH("/tasks/:tid", taskH.Update)
		a.DELETE("/tasks/:tid", taskH.Delete)
		a.PATCH("/tasks/:tid/move", taskH.Move)
		a.POST("/tasks/:tid/archive", taskH.Archive)
		a.POST("/tasks/:tid/subtasks", taskH.AddSubtask)
		a.POST("/tasks/:tid/comments", taskH.AddComment)
		a.POST("/tasks/:tid/tags", taskH.AddTag)
		a.DELETE("/tasks/:tid/tags/:tagId", taskH.RemoveTag)

		a.GET("/conversations", imH.Conversations)
		a.POST("/conversations", imH.CreateConversation)
		a.GET("/conversations/:cid/messages", imH.Messages)
		a.POST("/conversations/:cid/read", imH.MarkRead)
		a.POST("/messages/:mid/recall", imH.RecallMessage)

		a.GET("/docs", docH.List)
		a.POST("/docs", docH.Create)
		a.GET("/docs/:did", docH.Get)
		a.PATCH("/docs/:did", docH.Update)

		a.GET("/files", fileH.List)
		a.POST("/files", fileH.Upload)

		a.POST("/ai/breakdown", aiH.Breakdown)
		a.POST("/ai/summarize", aiH.Summarize)

		a.POST("/approvals", approvalH.Create)
		a.GET("/approvals", approvalH.List)
		a.POST("/approvals/:aid/decide", approvalH.Decide)

		a.GET("/meetings", meetingH.List)
		a.POST("/meetings", meetingH.Create)

		a.GET("/apps", appH.List)
		a.POST("/apps/:key/install", appH.Install)
		a.POST("/apps/:key/uninstall", appH.Uninstall)

		a.POST("/checkin", calH.Checkin)
		a.GET("/checkin/status", calH.CheckinStatus)
		a.POST("/events", calH.CreateEvent)
		a.GET("/events", calH.ListEvents)

		a.GET("/notifications", notifH.List)
		a.GET("/notifications/unread-count", notifH.UnreadCount)
		a.POST("/notifications/read-all", notifH.MarkAllRead)
		a.PATCH("/notifications/:nid/read", notifH.MarkRead)
	}

	adm := api.Group("/admin")
	adm.Use(middleware.Auth(cfg.JWTSecret), middleware.AdminOnly(db))
	{
		adm.GET("/stats", adminH.Stats)
		adm.GET("/users", adminH.Users)
		adm.PATCH("/users/:uid/role", adminH.SetRole)
		adm.DELETE("/users/:uid", adminH.DeleteUser)
		adm.GET("/projects", adminH.Projects)
		adm.GET("/departments", adminH.Departments)
		adm.POST("/departments", adminH.CreateDepartment)
		adm.DELETE("/departments/:did", adminH.DeleteDepartment)
		adm.PATCH("/users/:uid/department", adminH.SetUserDepartment)
	}

	return r
}
