package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Base 为所有实体提供 UUID 主键与时间戳。
type Base struct {
	ID        string         `gorm:"type:varchar(36);primaryKey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate 在插入前生成 UUID 主键。
func (b *Base) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.NewString()
	}
	return nil
}

type User struct {
	Base
	Name         string `gorm:"size:64;not null" json:"name"`
	Email        string `gorm:"size:128;uniqueIndex;not null" json:"email"`
	PasswordHash string `gorm:"size:255;not null" json:"-"`
	Avatar       string `gorm:"size:255" json:"avatar"`
	Role         string  `gorm:"size:16;default:member" json:"role"` // admin / member（系统级角色）
	MustChangePwd bool   `gorm:"default:false" json:"mustChangePassword"`
	DepartmentID *string `gorm:"type:varchar(36);index" json:"departmentId,omitempty"`
}

type Department struct {
	Base
	Name     string  `gorm:"size:64;not null" json:"name"`
	ParentID *string `gorm:"type:varchar(36);index" json:"parentId,omitempty"`
}

type AppInstall struct {
	Base
	AppKey string `gorm:"size:64;uniqueIndex" json:"appKey"`
}

type Meeting struct {
	Base
	Title  string `gorm:"size:255;not null" json:"title"`
	Room   string `gorm:"size:64;uniqueIndex" json:"room"`
	HostID string `gorm:"type:varchar(36);index" json:"hostId"`
	Host   *User  `gorm:"foreignKey:HostID" json:"host,omitempty"`
}

type Project struct {
	Base
	Name        string `gorm:"size:128;not null" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	Color       string `gorm:"size:16" json:"color"`
	OwnerID     string `gorm:"type:varchar(36);index" json:"ownerId"`
	Archived    bool   `json:"archived"`
}

type ProjectMember struct {
	ProjectID string    `gorm:"type:varchar(36);primaryKey" json:"projectId"`
	UserID    string    `gorm:"type:varchar(36);primaryKey" json:"userId"`
	Role      string    `gorm:"size:16;default:member" json:"role"` // owner / admin / member
	CreatedAt time.Time `json:"createdAt"`
	User      *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type TaskColumn struct {
	Base
	ProjectID string `gorm:"type:varchar(36);index" json:"projectId"`
	Name      string `gorm:"size:64;not null" json:"name"`
	Sort      int    `json:"sort"`
}

type Task struct {
	Base
	ProjectID   string         `gorm:"type:varchar(36);index" json:"projectId"`
	ColumnID    string         `gorm:"type:varchar(36);index" json:"columnId"`
	ParentID    *string        `gorm:"type:varchar(36);index" json:"parentId,omitempty"`
	Title       string         `gorm:"size:255;not null" json:"title"`
	Description string         `gorm:"type:text" json:"description"`
	AssigneeID  *string        `gorm:"type:varchar(36);index" json:"assigneeId,omitempty"`
	Priority    string         `gorm:"size:16;default:mid" json:"priority"` // low / mid / high / urgent
	Status      string         `gorm:"size:16;default:todo" json:"status"`
	Archived    bool           `gorm:"default:false;index" json:"archived"`
	DueAt       *time.Time     `json:"dueAt,omitempty"`
	Sort        float64        `json:"sort"`
	Assignee    *User          `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
	Subtasks    []Task         `gorm:"foreignKey:ParentID" json:"subtasks,omitempty"`
	Comments    []TaskComment  `gorm:"foreignKey:TaskID" json:"comments,omitempty"`
	Tags        []Tag          `gorm:"many2many:task_tags;" json:"tags,omitempty"`
}

type Tag struct {
	Base
	ProjectID string `gorm:"type:varchar(36);index" json:"projectId"`
	Name      string `gorm:"size:32;not null" json:"name"`
	Color     string `gorm:"size:16" json:"color"`
}

type TaskComment struct {
	Base
	TaskID  string `gorm:"type:varchar(36);index" json:"taskId"`
	UserID  string `gorm:"type:varchar(36);index" json:"userId"`
	Content string `gorm:"type:text" json:"content"`
	User    *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type Conversation struct {
	Base
	Type      string  `gorm:"size:16;default:group" json:"type"` // group / single
	Name      string  `gorm:"size:128" json:"name"`
	ProjectID *string `gorm:"type:varchar(36);index" json:"projectId,omitempty"`
}

type ConversationMember struct {
	ConversationID string    `gorm:"type:varchar(36);primaryKey" json:"conversationId"`
	UserID         string    `gorm:"type:varchar(36);primaryKey" json:"userId"`
	LastReadAt     time.Time `json:"lastReadAt"`
}

type Message struct {
	Base
	ConversationID string `gorm:"type:varchar(36);index" json:"conversationId"`
	SenderID       string `gorm:"type:varchar(36);index" json:"senderId"`
	Type           string `gorm:"size:16;default:text" json:"type"` // text / file / image / system
	Content        string `gorm:"type:text" json:"content"`
	Recalled       bool   `gorm:"default:false" json:"recalled"`
	Sender         *User  `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
}

type Document struct {
	Base
	ProjectID   *string `gorm:"type:varchar(36);index" json:"projectId,omitempty"`
	Title       string  `gorm:"size:255;not null" json:"title"`
	Kind        string  `gorm:"size:16;default:doc" json:"kind"` // doc / board（白板：思维导图/流程图）
	ContentJSON string  `gorm:"type:text" json:"contentJson"`
	ContentMD   string  `gorm:"type:text" json:"contentMd"`
	CreatedBy   string  `gorm:"type:varchar(36)" json:"createdBy"`
}

type File struct {
	Base
	Name       string  `gorm:"size:255;not null" json:"name"`
	Size       int64   `json:"size"`
	Mime       string  `gorm:"size:128" json:"mime"`
	StorageKey string  `gorm:"size:255" json:"storageKey"`
	OwnerID    string  `gorm:"type:varchar(36);index" json:"ownerId"`
	ProjectID  *string `gorm:"type:varchar(36);index" json:"projectId,omitempty"`
}

type Notification struct {
	Base
	UserID  string `gorm:"type:varchar(36);index" json:"userId"` // 接收者
	ActorID string `gorm:"type:varchar(36)" json:"actorId"`      // 触发者
	Type    string `gorm:"size:16" json:"type"`                  // assigned / comment / mention / member / system
	Title   string `gorm:"size:255" json:"title"`
	Body    string `gorm:"type:text" json:"body"`
	Link    string `gorm:"size:255" json:"link"`
	Read    bool   `gorm:"default:false;index" json:"read"`
}

type Approval struct {
	Base
	Title       string `gorm:"size:255;not null" json:"title"`
	Type        string `gorm:"size:16" json:"type"` // leave/expense/purchase/general
	Content     string `gorm:"type:text" json:"content"`
	ApplicantID string `gorm:"type:varchar(36);index" json:"applicantId"`
	ApproverID  string `gorm:"type:varchar(36);index" json:"approverId"`
	Status      string `gorm:"size:16;default:pending;index" json:"status"` // pending/approved/rejected
	Comment     string `gorm:"type:text" json:"comment"`
	Applicant   *User  `gorm:"foreignKey:ApplicantID" json:"applicant,omitempty"`
	Approver    *User  `gorm:"foreignKey:ApproverID" json:"approver,omitempty"`
}

type CheckIn struct {
	Base
	UserID    string    `gorm:"type:varchar(36);index" json:"userId"`
	Day       string    `gorm:"size:10;index" json:"day"` // YYYY-MM-DD
	CheckedAt time.Time `json:"checkedAt"`
}

type CalendarEvent struct {
	Base
	UserID  string `gorm:"type:varchar(36);index" json:"userId"`
	Title   string `gorm:"size:255;not null" json:"title"`
	Date    string `gorm:"size:10;index" json:"date"` // YYYY-MM-DD
	Content string `gorm:"type:text" json:"content"`
}

// All 返回需要迁移的全部模型，供 AutoMigrate 使用。
func All() []any {
	return []any{
		&User{}, &Project{}, &ProjectMember{}, &TaskColumn{}, &Task{}, &TaskComment{},
		&Conversation{}, &ConversationMember{}, &Message{}, &Document{}, &File{}, &Notification{},
		&Approval{}, &CheckIn{}, &CalendarEvent{}, &Department{}, &AppInstall{}, &Meeting{}, &Tag{},
	}
}
