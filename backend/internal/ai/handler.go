package ai

import (
	"strings"

	"hive/internal/common"

	"github.com/gin-gonic/gin"
)

// Handler 提供 AI 能力。Key 为可选的 LLM 密钥：为空时使用本地启发式（离线可用），
// 配置后可在此接入真实大模型（如 Claude / OpenAI）。
type Handler struct {
	Key string
}

type breakdownReq struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
}

// Breakdown 将一个任务智能拆解为子任务清单。
func (h *Handler) Breakdown(c *gin.Context) {
	var req breakdownReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	// TODO: 当 h.Key 非空时调用真实 LLM；当前用启发式保证离线可用。
	common.OK(c, gin.H{"subtasks": heuristicBreakdown(req.Title, req.Description)})
}

type summarizeReq struct {
	Text string `json:"text" binding:"required"`
}

// Summarize 对会话/文档文本做要点摘要（启发式）。
func (h *Handler) Summarize(c *gin.Context) {
	var req summarizeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Fail(c, 400, err.Error())
		return
	}
	common.OK(c, gin.H{"summary": heuristicSummary(req.Text)})
}

// heuristicBreakdown 根据标题领域关键词与描述内容生成合理的子任务序列。
func heuristicBreakdown(title, desc string) []string {
	t := strings.TrimSpace(title)
	subs := []string{"梳理「" + t + "」的目标与验收标准"}

	has := func(kw ...string) bool {
		for _, k := range kw {
			if strings.Contains(t, k) {
				return true
			}
		}
		return false
	}

	switch {
	case has("设计", "原型", "UI", "视觉"):
		subs = append(subs, "竞品/参考调研", "低保真草图与信息架构", "高保真视觉稿", "交互状态标注与切图", "设计评审与修订")
	case has("接口", "后端", "服务", "API", "数据库"):
		subs = append(subs, "接口/数据模型设计", "核心逻辑实现", "单元测试", "联调与错误处理", "性能与安全检查")
	case has("前端", "页面", "组件"):
		subs = append(subs, "页面结构与路由", "组件开发", "对接接口与状态管理", "响应式与交互打磨", "自测与回归")
	case has("测试", "QA", "回归"):
		subs = append(subs, "测试用例编写", "功能/边界测试", "缺陷登记与跟踪", "回归验证")
	case has("文档", "方案", "调研"):
		subs = append(subs, "资料收集", "提纲拟定", "正文撰写", "评审与定稿")
	default:
		subs = append(subs, "调研与方案设计", "任务拆分与排期", "核心实现", "联调与自测", "评审与交付")
	}

	for _, line := range strings.Split(desc, "\n") {
		if s := strings.TrimSpace(line); s != "" {
			subs = append(subs, "落实："+s)
		}
	}
	return subs
}

func heuristicSummary(text string) string {
	lines := []string{}
	for _, l := range strings.Split(text, "\n") {
		if s := strings.TrimSpace(l); s != "" {
			lines = append(lines, "· "+s)
		}
		if len(lines) >= 5 {
			break
		}
	}
	if len(lines) == 0 {
		return "（无可摘要内容）"
	}
	return "要点摘要：\n" + strings.Join(lines, "\n")
}
