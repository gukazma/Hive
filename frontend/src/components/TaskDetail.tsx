import { useEffect, useState } from "react";
import {
  Avatar, Button, Checkbox, DatePicker, Drawer, Input, Popconfirm, Select, Space, Spin, message,
} from "antd";
import { DeleteOutlined, ThunderboltOutlined, InboxOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { aiApi, projectApi, taskApi, userApi, type Tag, type Task, type User } from "@/api";
import { color, prioLabel } from "@/theme/tokens";

const prioOptions = ["low", "mid", "high", "urgent"].map((v) => ({ value: v, label: prioLabel[v] }));

export default function TaskDetail({ taskId, onClose, onChanged }: { taskId: string | null; onClose: () => void; onChanged: () => void }) {
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSub, setNewSub] = useState("");
  const [newComment, setNewComment] = useState("");
  const [aiSubs, setAiSubs] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [projectTags, setProjectTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");

  const loadTags = (pid: string) => projectApi.tags(pid).then(setProjectTags).catch(() => {});
  const addTag = async (tagId: string) => { if (!task) return; await taskApi.addTag(task.id, tagId); load(); onChanged(); };
  const removeTag = async (tagId: string) => { if (!task) return; await taskApi.removeTag(task.id, tagId); load(); onChanged(); };
  const createTag = async () => {
    if (!newTag.trim() || !task) return;
    const palette = ["#4F46E5", "#16A34A", "#F59E0B", "#DC2626", "#0EA5E9", "#7C3AED"];
    const t = await projectApi.createTag(task.projectId, { name: newTag.trim(), color: palette[projectTags.length % palette.length] });
    setNewTag(""); await loadTags(task.projectId); addTag(t.id);
  };

  const load = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const full = await taskApi.get(taskId);
      setTask(full);
      setAiSubs([]);
      loadTags(full.projectId);
    } finally { setLoading(false); }
  };

  const runAI = async () => {
    if (!task) return;
    setAiLoading(true);
    try { const r = await aiApi.breakdown(task.title, task.description || ""); setAiSubs(r.subtasks); }
    catch { message.error("AI 拆解失败"); }
    finally { setAiLoading(false); }
  };
  const adoptAll = async () => {
    if (!task) return;
    for (const s of aiSubs) await taskApi.subtask(task.id, s);
    setAiSubs([]); message.success("已采纳为子任务"); load(); onChanged();
  };

  useEffect(() => { if (taskId) { load(); userApi.search().then(setUsers); } /* eslint-disable-next-line */ }, [taskId]);

  const patch = async (b: any) => {
    if (!task) return;
    const updated = await taskApi.update(task.id, b);
    setTask({ ...task, ...updated });
    onChanged();
  };

  const toggleSub = async (sub: Task) => {
    const done = sub.status === "done";
    await taskApi.update(sub.id, { status: done ? "todo" : "done" });
    load(); onChanged();
  };

  const addSub = async () => {
    if (!newSub.trim() || !task) return;
    await taskApi.subtask(task.id, newSub.trim());
    setNewSub("");
    load(); onChanged();
  };

  const addComment = async () => {
    if (!newComment.trim() || !task) return;
    await taskApi.comment(task.id, newComment.trim());
    setNewComment("");
    load(); onChanged();
  };

  const archive = async () => {
    if (!task) return;
    await taskApi.archive(task.id);
    message.success("已归档");
    onChanged();
    onClose();
  };
  const del = async () => {
    if (!task) return;
    await taskApi.remove(task.id);
    message.success("任务已删除");
    onChanged();
    onClose();
  };

  const Label = ({ children }: { children: any }) => (
    <div style={{ width: 72, color: "var(--hive-muted)", fontSize: 13, flexShrink: 0 }}>{children}</div>
  );

  return (
    <Drawer open={!!taskId} onClose={onClose} width={480} title="任务详情"
      extra={<Space>
        <Button size="small" icon={<InboxOutlined />} onClick={archive}>归档</Button>
        <Popconfirm title="确认删除该任务？" onConfirm={del}><Button danger icon={<DeleteOutlined />} size="small">删除</Button></Popconfirm>
      </Space>}>
      {loading || !task ? (
        <div style={{ display: "grid", placeItems: "center", height: 200 }}><Spin /></div>
      ) : (
        <Space direction="vertical" size={18} style={{ width: "100%" }}>
          <Input.TextArea defaultValue={task.title} autoSize onBlur={(e) => e.target.value !== task.title && patch({ title: e.target.value })}
            style={{ fontSize: 18, fontWeight: 600 }} />

          <div style={{ display: "flex", alignItems: "center" }}><Label>负责人</Label>
            <Select style={{ flex: 1 }} allowClear placeholder="未指派" value={task.assigneeId}
              onChange={(v) => patch({ assigneeId: v || "" })}
              options={users.map((u) => ({ value: u.id, label: u.name }))} />
          </div>
          <div style={{ display: "flex", alignItems: "center" }}><Label>优先级</Label>
            <Select style={{ flex: 1 }} value={task.priority} onChange={(v) => patch({ priority: v })} options={prioOptions} />
          </div>
          <div style={{ display: "flex", alignItems: "center" }}><Label>到期</Label>
            <DatePicker style={{ flex: 1 }} value={task.dueAt ? dayjs(task.dueAt) : null}
              onChange={(d) => patch({ dueAt: d ? d.toISOString() : null })} />
          </div>
          <div style={{ display: "flex", alignItems: "center" }}><Label>状态</Label>
            <Select style={{ flex: 1 }} value={task.status} onChange={(v) => patch({ status: v })}
              options={[{ value: "todo", label: "待办" }, { value: "doing", label: "进行中" }, { value: "done", label: "已完成" }]} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start" }}><Label>标签</Label>
            <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {(task.tags ?? []).map((tg) => (
                <span key={tg.id} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: tg.color + "22", color: tg.color, border: `1px solid ${tg.color}55` }}>
                  {tg.name} <span onClick={() => removeTag(tg.id)} style={{ cursor: "pointer", fontWeight: 700 }}>×</span>
                </span>
              ))}
              <Select size="small" style={{ width: 110 }} placeholder="选择标签" value={undefined}
                onChange={(v) => v && addTag(String(v))}
                options={projectTags.filter((pt) => !(task.tags ?? []).some((t) => t.id === pt.id)).map((pt) => ({ value: pt.id, label: pt.name }))} />
              <Input size="small" style={{ width: 96 }} placeholder="+ 新建" value={newTag} onChange={(e) => setNewTag(e.target.value)} onPressEnter={createTag} />
            </div>
          </div>

          <div>
            <div style={{ color: "var(--hive-muted)", fontSize: 13, marginBottom: 6 }}>描述</div>
            <Input.TextArea defaultValue={task.description} autoSize={{ minRows: 3 }} placeholder="补充描述…"
              onBlur={(e) => e.target.value !== (task.description || "") && patch({ description: e.target.value })} />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>子任务</span>
              <Button size="small" icon={<ThunderboltOutlined />} loading={aiLoading} onClick={runAI}>AI 拆解</Button>
            </div>
            {aiSubs.length > 0 && (
              <div style={{ border: "1px dashed var(--hive-primary)", borderRadius: 8, padding: 10, marginBottom: 8, background: "var(--hive-primary-soft)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--hive-primary)" }}>AI 建议（{aiSubs.length}）</span>
                  <Space>
                    <Button size="small" type="primary" onClick={adoptAll}>采纳全部</Button>
                    <Button size="small" onClick={() => setAiSubs([])}>忽略</Button>
                  </Space>
                </div>
                {aiSubs.map((s, i) => <div key={i} style={{ fontSize: 13, padding: "2px 0", color: "var(--hive-body)" }}>• {s}</div>)}
              </div>
            )}
            {(task.subtasks ?? []).map((s) => (
              <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
                <Checkbox checked={s.status === "done"} onChange={() => toggleSub(s)} />
                <span style={{ textDecoration: s.status === "done" ? "line-through" : "none", color: s.status === "done" ? "var(--hive-muted)" : "var(--hive-ink)" }}>{s.title}</span>
              </div>
            ))}
            <Input placeholder="+ 添加子任务" value={newSub} onChange={(e) => setNewSub(e.target.value)} onPressEnter={addSub} style={{ marginTop: 6 }} />
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>评论</div>
            {(task.comments ?? []).map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <Avatar size={28} style={{ background: color.primary, flexShrink: 0 }}>{c.user?.name?.[0] ?? "?"}</Avatar>
                <div>
                  <div style={{ fontSize: 13 }}><b>{c.user?.name}</b> <span style={{ color: "var(--hive-muted)", fontSize: 12 }}>{dayjs(c.createdAt).format("MM-DD HH:mm")}</span></div>
                  <div style={{ color: "var(--hive-body)" }}>{c.content}</div>
                </div>
              </div>
            ))}
            <Input.Search placeholder="添加评论…" enterButton="发送" value={newComment} onChange={(e) => setNewComment(e.target.value)} onSearch={addComment} />
          </div>
        </Space>
      )}
    </Drawer>
  );
}
