# Hive · 团队协作平台

一个可私有化部署的团队协作工具（项目/任务/看板 · 即时通讯 · 文档协作 · 文件管理）。
DooTask 式产品形态的**净室重写**：自有品牌、全新技术栈（Go + React + PostgreSQL），与 DooTask 无任何代码/视觉/表结构关联。

## 技术栈

- **后端**：Go + Gin + GORM + PostgreSQL，Redis（WebSocket 跨实例广播），JWT 鉴权
- **前端**：React 18 + TypeScript + Vite + Ant Design + Zustand + TanStack Query + @dnd-kit
- **部署**：Docker Compose 一键启动

## 目录结构

```
Hive/
├─ backend/                 # Go 模块化单体
│  ├─ cmd/server/main.go
│  └─ internal/{config,database,models,common,middleware,auth,project,task,im,router}
├─ frontend/                # React + Vite
│  └─ src/{api,stores,components,pages,theme,styles}
├─ design-tokens.css        # 设计 token（CSS 变量，含深色）
├─ exports/                 # Pencil 原型导出的 PNG 切图
├─ pencil-new.pen           # 设计原型源文件（Pencil）
└─ docker-compose.yml
```

## 一键启动（Docker）

```bash
docker compose up --build
```

- 前端：http://localhost:8000
- 后端 API：http://localhost:8080/api/health

### 默认管理员

首次启动（库中无用户时）会种子一个超级管理员（可在 compose / `.env` 用 `ADMIN_EMAIL`、`ADMIN_PASSWORD` 配置）：

```
邮箱：admin@hive.local
密码：admin        # 登录后请尽快修改
```

重置任意账号密码：
```bash
docker compose exec backend /hive repassword <邮箱> <新密码>
```

也可点「立即注册」自助创建普通账号 → 新建项目 → 进入看板拖拽任务。

## 本地开发

**后端**（需 Go 1.22+、本地 PostgreSQL 与 Redis）：
```bash
cd backend
cp .env.example .env   # 按需修改 DATABASE_URL / REDIS_ADDR
go mod tidy
go run ./cmd/server
```

**前端**（需 Node 20+）：
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173 ，已代理 /api 与 /ws 到 :8080
```

## 已实现（MVP · 四大模块贯通）

- 鉴权：注册 / 登录 / 当前用户（JWT）
- 项目 / 任务 / 看板：项目列表与创建（自动建默认看板列、owner 成员、项目群会话）；任务增删改、子任务、评论、@dnd-kit 拖拽移动
- 即时通讯：WebSocket Hub（Redis Pub/Sub 跨实例）+ 会话 / 历史消息 + 实时收发
- 文档协作：文档列表 / 新建 / Markdown 编辑保存
- 文件管理：multipart 上传到本地（静态托管 /uploads）+ 列表
- 账号与权限：种子超级管理员（env 配置）、系统角色 admin/member、**首次登录强制改密**、`repassword` 命令
- 管理后台（仅 admin）：全站统计、用户管理（改角色 / 删除）、项目总览；`/api/admin/*` 由 AdminOnly 守卫（非管理员 403）
- 前端页面：登录、工作台、看板、消息（实时聊天）、文档、文件、管理后台，Rail 按路由高亮、管理入口仅管理员可见

> 后端经逐文件审查；首次在目标机执行 `go mod tidy` 拉取依赖后即可 `go run` 或 `docker compose` 编译运行。

## 设计原型

完整 UI/UX 在 `pencil-new.pen`，切图在 `exports/`（15 屏：桌面 10 + 深色 2 + 移动 3）。
设计 token 见 `design-tokens.css` 与 `frontend/src/theme/tokens.ts`。

## 路线图

M1 任务管理 ✓ · M2 IM（基础）✓ · M3 文档+文件 · M4 实时协同(Yjs)+AI 助手 · M5 通知/搜索/权限打磨
