import client from "./client";

export interface User { id: string; name: string; email: string; avatar?: string; role?: string; mustChangePassword?: boolean; createdAt?: string; departmentId?: string; }
export interface Project { id: string; name: string; description: string; color: string; ownerId: string; }
export interface Column { id: string; projectId: string; name: string; sort: number; }
export interface Task {
  id: string; projectId: string; columnId: string; title: string; description?: string;
  priority: string; status: string; dueAt?: string; sort: number; createdAt?: string;
  assignee?: User; assigneeId?: string; subtasks?: Task[]; comments?: Comment[];
  subTotal?: number; subDone?: number; commentCount?: number; tags?: Tag[];
}
export interface Comment { id: string; content: string; createdAt: string; user?: User; }
export interface Tag { id: string; name: string; color: string; projectId?: string; }
export interface Conversation { id: string; name: string; type: string; projectId?: string; unread?: number; }
export interface Message { id: string; conversationId: string; content: string; type: string; createdAt: string; sender?: User; recalled?: boolean; }

export const authApi = {
  register: (b: { name: string; email: string; password: string }) =>
    client.post<any, { token: string; user: User }>("/auth/register", b),
  login: (b: { email: string; password: string }) =>
    client.post<any, { token: string; user: User }>("/auth/login", b),
  me: () => client.get<any, User>("/auth/me"),
  updateProfile: (b: { name?: string; avatar?: string }) => client.patch<any, User>("/auth/profile", b),
  changePassword: (b: { oldPassword: string; newPassword: string }) =>
    client.post("/auth/change-password", b),
};

export interface AdminStats { users: number; projects: number; tasks: number; }
export interface Department { id: string; name: string; parentId?: string; }
export const adminApi = {
  stats: () => client.get<any, AdminStats>("/admin/stats"),
  users: () => client.get<any, User[]>("/admin/users"),
  setRole: (uid: string, role: string) => client.patch(`/admin/users/${uid}/role`, { role }),
  deleteUser: (uid: string) => client.delete(`/admin/users/${uid}`),
  projects: () => client.get<any, Project[]>("/admin/projects"),
  departments: () => client.get<any, Department[]>("/admin/departments"),
  createDept: (name: string, parentId?: string) => client.post<any, Department>("/admin/departments", { name, parentId }),
  deleteDept: (did: string) => client.delete(`/admin/departments/${did}`),
  setUserDept: (uid: string, departmentId: string | null) => client.patch(`/admin/users/${uid}/department`, { departmentId }),
};

export const projectApi = {
  list: () => client.get<any, Project[]>("/projects"),
  create: (b: { name: string; description?: string; color?: string }) =>
    client.post<any, Project>("/projects", b),
  get: (id: string) => client.get<any, { project: Project; members: any[] }>(`/projects/${id}`),
  columns: (id: string) => client.get<any, Column[]>(`/projects/${id}/columns`),
  createColumn: (id: string, name: string) => client.post<any, Column>(`/projects/${id}/columns`, { name }),
  tags: (id: string) => client.get<any, Tag[]>(`/projects/${id}/tags`),
  createTag: (id: string, b: { name: string; color?: string }) => client.post<any, Tag>(`/projects/${id}/tags`, b),
  tasks: (id: string) => client.get<any, Task[]>(`/projects/${id}/tasks`),
  createTask: (id: string, b: any) => client.post<any, Task>(`/projects/${id}/tasks`, b),
  addMember: (id: string, userId: string, role = "member") =>
    client.post(`/projects/${id}/members`, { userId, role }),
};

export const taskApi = {
  get: (tid: string) => client.get<any, Task>(`/tasks/${tid}`),
  update: (tid: string, b: any) => client.patch<any, Task>(`/tasks/${tid}`, b),
  remove: (tid: string) => client.delete(`/tasks/${tid}`),
  archive: (tid: string) => client.post(`/tasks/${tid}/archive`),
  move: (tid: string, b: { columnId: string; sort: number }) => client.patch(`/tasks/${tid}/move`, b),
  subtask: (tid: string, title: string) => client.post<any, Task>(`/tasks/${tid}/subtasks`, { title }),
  addTag: (tid: string, tagId: string) => client.post(`/tasks/${tid}/tags`, { tagId }),
  removeTag: (tid: string, tagId: string) => client.delete(`/tasks/${tid}/tags/${tagId}`),
  comment: (tid: string, content: string) => client.post<any, Comment>(`/tasks/${tid}/comments`, { content }),
};

export const userApi = {
  search: (q = "") => client.get<any, User[]>(`/users?q=${encodeURIComponent(q)}`),
};

export interface Meeting { id: string; title: string; room: string; host?: User; createdAt: string; }
export const meetingApi = {
  list: () => client.get<any, Meeting[]>("/meetings"),
  create: (title: string) => client.post<any, Meeting>("/meetings", { title }),
};

export interface AppItem { key: string; name: string; desc: string; category: string; icon: string; installed: boolean; }
export const appApi = {
  list: () => client.get<any, AppItem[]>("/apps"),
  install: (key: string) => client.post(`/apps/${key}/install`),
  uninstall: (key: string) => client.post(`/apps/${key}/uninstall`),
};

export interface SearchResult { type: string; title: string; subtitle: string; link: string; }
export const searchApi = {
  query: (q: string) => client.get<any, SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),
};

export const aiApi = {
  breakdown: (title: string, description = "") => client.post<any, { subtasks: string[] }>("/ai/breakdown", { title, description }),
  summarize: (text: string) => client.post<any, { summary: string }>("/ai/summarize", { text }),
};

export interface Approval { id: string; title: string; type: string; content: string; status: string; comment: string; applicant?: User; approver?: User; createdAt: string; }
export const approvalApi = {
  list: (box: "mine" | "todo" = "mine") => client.get<any, Approval[]>(`/approvals?box=${box}`),
  create: (b: { title: string; type?: string; content?: string; approverId: string }) => client.post<any, Approval>("/approvals", b),
  decide: (aid: string, action: "approve" | "reject", comment = "") => client.post(`/approvals/${aid}/decide`, { action, comment }),
};

export interface CalendarEvent { id: string; title: string; date: string; content: string; }
export interface CheckinStatus { checkedToday: boolean; monthCount: number; recent: { id: string; day: string; checkedAt: string }[]; }
export const calendarApi = {
  checkin: () => client.post("/checkin"),
  status: () => client.get<any, CheckinStatus>("/checkin/status"),
  events: (month?: string) => client.get<any, CalendarEvent[]>(`/events${month ? `?month=${month}` : ""}`),
  createEvent: (b: { title: string; date: string; content?: string }) => client.post<any, CalendarEvent>("/events", b),
};

export interface Notification { id: string; type: string; title: string; body: string; link: string; read: boolean; createdAt: string; }
export const notifApi = {
  list: () => client.get<any, Notification[]>("/notifications"),
  unreadCount: () => client.get<any, { count: number }>("/notifications/unread-count"),
  markRead: (nid: string) => client.patch(`/notifications/${nid}/read`),
  markAllRead: () => client.post("/notifications/read-all"),
};

export const imApi = {
  conversations: () => client.get<any, Conversation[]>("/conversations"),
  create: (b: { type?: string; name?: string; memberIds: string[] }) => client.post<any, Conversation>("/conversations", b),
  messages: (cid: string) => client.get<any, Message[]>(`/conversations/${cid}/messages`),
  markRead: (cid: string) => client.post(`/conversations/${cid}/read`),
  recall: (mid: string) => client.post(`/messages/${mid}/recall`),
};

export interface Doc { id: string; title: string; kind?: string; contentMd: string; contentJson: string; projectId?: string; updatedAt: string; }
export interface FileItem { id: string; name: string; size: number; mime: string; storageKey: string; createdAt: string; }

export const docApi = {
  list: () => client.get<any, Doc[]>("/docs"),
  create: (b: { title: string; kind?: string; projectId?: string }) => client.post<any, Doc>("/docs", b),
  get: (did: string) => client.get<any, Doc>(`/docs/${did}`),
  update: (did: string, b: { title?: string; contentMd?: string; contentJson?: string }) =>
    client.patch<any, Doc>(`/docs/${did}`, b),
};

export const fileApi = {
  list: () => client.get<any, FileItem[]>("/files"),
  upload: (fd: FormData) => client.post<any, FileItem>("/files", fd),
};

// WebSocket 地址（带 token），开发态走 vite 代理，生产走同源 nginx。
export function wsURL(token: string) {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/api/ws?token=${encodeURIComponent(token)}`;
}
