import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, DragEndEvent, DragOverlay, PointerSensor, closestCorners, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, Button, Empty, Input, Modal, Segmented, Select, Spin, Table, Tag, Typography, message } from "antd";
import { UserAddOutlined, CalendarOutlined, CheckSquareOutlined, MessageOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { projectApi, taskApi, userApi, type Column, type Task, type User } from "@/api";
import { color, prioLabel } from "@/theme/tokens";
import TaskDetail from "@/components/TaskDetail";

function Card({ task, onOpen, overlay }: { task: Task; onOpen: (id: string) => void; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: overlay });
  const bar = color.prio[task.priority] || color.prio.mid;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onOpen(task.id)}
      style={{
        background: "var(--hive-surface)", borderRadius: 8, border: "1px solid var(--hive-border)",
        borderLeft: `3px solid ${bar}`, padding: "10px 12px", marginBottom: 10,
        opacity: isDragging ? 0.4 : 1, cursor: "grab", boxShadow: "0 1px 2px rgba(15,23,42,.06)",
        transform: CSS.Transform.toString(transform), transition,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--hive-ink)", lineHeight: 1.4, textDecoration: task.status === "done" ? "line-through" : "none", marginBottom: 8 }}>{task.title}</div>
      {!!task.tags?.length && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          {task.tags.map((tg) => (
            <span key={tg.id} style={{ fontSize: 11, padding: "1px 8px", borderRadius: 999, background: tg.color + "22", color: tg.color, border: `1px solid ${tg.color}55` }}>{tg.name}</span>
          ))}
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <Tag color={task.priority === "urgent" ? "error" : task.priority === "high" ? "warning" : task.priority === "mid" ? "processing" : "default"} style={{ margin: 0 }}>
          {prioLabel[task.priority] ?? task.priority}
        </Tag>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", color: "var(--hive-muted)", fontSize: 12 }}>
          {task.dueAt && (() => {
            const overdue = dayjs(task.dueAt).isBefore(dayjs(), "day");
            const today = dayjs(task.dueAt).isSame(dayjs(), "day");
            const c = overdue ? "var(--hive-danger)" : today ? "var(--hive-honey)" : "var(--hive-muted)";
            return <span style={{ display: "flex", gap: 3, alignItems: "center", color: c }}><CalendarOutlined />{dayjs(task.dueAt).format("MM-DD")}</span>;
          })()}
          {!!task.subTotal && <span style={{ display: "flex", gap: 3, alignItems: "center" }}><CheckSquareOutlined />{task.subDone}/{task.subTotal}</span>}
          {!!task.commentCount && <span style={{ display: "flex", gap: 3, alignItems: "center" }}><MessageOutlined />{task.commentCount}</span>}
        </div>
        {task.assignee && <Avatar size={22} style={{ background: color.primary, flexShrink: 0 }}>{task.assignee.name[0]}</Avatar>}
      </div>
    </div>
  );
}

function ColumnView({ col, tasks, onAdd, onOpen }: { col: Column; tasks: Task[]; onAdd: (colId: string, title: string) => void; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const [title, setTitle] = useState("");
  return (
    <div style={{ width: 280, flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px 8px" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 600, color: "var(--hive-ink)" }}>{col.name}</span>
          <span style={{ color: "var(--hive-muted)", fontSize: 13 }}>{tasks.length}</span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        style={{ minHeight: 80, padding: 4, borderRadius: 8, background: isOver ? "var(--hive-primary-soft)" : "transparent" }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => <Card key={t.id} task={t} onOpen={onOpen} />)}
        </SortableContext>
        <Input
          placeholder="+ 添加任务"
          variant="borderless"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onPressEnter={() => { if (title.trim()) { onAdd(col.id, title.trim()); setTitle(""); } }}
          style={{ color: "var(--hive-muted)" }}
        />
      </div>
    </div>
  );
}

function GanttChart({ tasks, onOpen }: { tasks: Task[]; onOpen: (id: string) => void }) {
  if (!tasks.length) return <Empty description="暂无任务" />;
  const dates: ReturnType<typeof dayjs>[] = [];
  tasks.forEach((t) => { dates.push(dayjs(t.createdAt)); if (t.dueAt) dates.push(dayjs(t.dueAt)); });
  let min = dates[0], max = dates[0];
  dates.forEach((d) => { if (d.isBefore(min)) min = d; if (d.isAfter(max)) max = d; });
  min = min.startOf("day"); max = max.startOf("day").add(2, "day");
  const days = Math.min(120, max.diff(min, "day") + 1);
  const dw = 34;
  return (
    <div style={{ overflow: "auto" }}>
      <div style={{ display: "flex" }}>
        <div style={{ width: 200, flexShrink: 0 }} />
        <div style={{ display: "flex" }}>
          {Array.from({ length: days }).map((_, i) => {
            const d = min.add(i, "day");
            return <div key={i} style={{ width: dw, flexShrink: 0, textAlign: "center", fontSize: 11, color: d.day() === 0 || d.day() === 6 ? "var(--hive-danger)" : "var(--hive-muted)", borderLeft: "1px solid var(--hive-border)" }}>{d.format("D")}</div>;
          })}
        </div>
      </div>
      {tasks.map((t) => {
        const start = dayjs(t.createdAt).startOf("day");
        const end = t.dueAt ? dayjs(t.dueAt).startOf("day") : start;
        const offset = Math.max(0, start.diff(min, "day"));
        const span = Math.max(1, end.diff(start, "day") + 1);
        const c = color.prio[t.priority] || color.primary;
        return (
          <div key={t.id} onClick={() => onOpen(t.id)} style={{ display: "flex", alignItems: "center", height: 34, borderTop: "1px solid var(--hive-border)", cursor: "pointer" }}>
            <div style={{ width: 200, flexShrink: 0, fontSize: 13, color: "var(--hive-ink)", paddingRight: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
            <div style={{ position: "relative", width: days * dw, flexShrink: 0, height: 34 }}>
              <div title={t.dueAt ? dayjs(t.dueAt).format("MM-DD") : "未排期"} style={{ position: "absolute", left: offset * dw + 3, top: 7, width: span * dw - 6, height: 20, background: c, borderRadius: 6, opacity: 0.9 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BarChart({ title, data }: { title: string; data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ background: "var(--hive-surface)", border: "1px solid var(--hive-border)", borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <div style={{ fontWeight: 600, color: "var(--hive-ink)", marginBottom: 12 }}>{title}</div>
      {data.map((d) => (
        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 88, color: "var(--hive-muted)", fontSize: 13 }}>{d.label}</div>
          <div style={{ flex: 1, height: 10, background: "var(--hive-bg-subtle)", borderRadius: 999 }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: 10, background: d.color || color.primary, borderRadius: 999 }} />
          </div>
          <div style={{ width: 28, textAlign: "right", color: "var(--hive-body)", fontSize: 13 }}>{d.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function Board() {
  const { id = "" } = useParams();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const projQ = useQuery({ queryKey: ["project", id], queryFn: () => projectApi.get(id), enabled: !!id });
  const colQ = useQuery({ queryKey: ["columns", id], queryFn: () => projectApi.columns(id), enabled: !!id });
  const taskQ = useQuery({ queryKey: ["tasks", id], queryFn: () => projectApi.tasks(id), enabled: !!id });

  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => { if (taskQ.data) setTasks(taskQ.data); }, [taskQ.data]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const qc = useQueryClient();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "list" | "dash" | "gantt">("board");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pick, setPick] = useState<string>();
  const [fPrio, setFPrio] = useState<string>();
  const refresh = () => qc.invalidateQueries({ queryKey: ["tasks", id] });

  const addColumn = async () => {
    const name = window.prompt("列名称");
    if (!name?.trim()) return;
    await projectApi.createColumn(id, name.trim());
    qc.invalidateQueries({ queryKey: ["columns", id] });
  };

  const openInvite = () => { setInviteOpen(true); userApi.search().then(setAllUsers); };
  const doInvite = async () => {
    if (!pick) return;
    try { await projectApi.addMember(id, pick); message.success("已邀请成员"); setInviteOpen(false); setPick(undefined); qc.invalidateQueries({ queryKey: ["project", id] }); }
    catch { message.error("邀请失败"); }
  };

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (fPrio && t.priority !== fPrio) continue;
      (map[t.columnId] ??= []).push(t);
    }
    for (const k in map) map[k].sort((a, b) => a.sort - b.sort);
    return map;
  }, [tasks, fPrio]);

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const activeId = e.active.id as string;
    const overId = e.over.id as string;
    const colIds = new Set((colQ.data ?? []).map((c) => c.id));
    const active = tasks.find((t) => t.id === activeId);
    if (!active) return;

    let targetCol: string;
    let idx: number;
    if (colIds.has(overId)) {
      targetCol = overId;
      idx = (grouped[targetCol] ?? []).filter((t) => t.id !== activeId).length;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      targetCol = overTask.columnId;
      const list = (grouped[targetCol] ?? []).filter((t) => t.id !== activeId);
      idx = list.findIndex((t) => t.id === overId);
      if (idx < 0) idx = list.length;
    }
    const list = (grouped[targetCol] ?? []).filter((t) => t.id !== activeId);
    const prev = list[idx - 1], next = list[idx];
    let newSort: number;
    if (!prev && !next) newSort = Date.now();
    else if (!prev) newSort = next.sort - 1000;
    else if (!next) newSort = prev.sort + 1000;
    else newSort = (prev.sort + next.sort) / 2;

    if (active.columnId === targetCol && active.sort === newSort) return;
    setTasks((p) => p.map((x) => (x.id === activeId ? { ...x, columnId: targetCol, sort: newSort } : x)));
    taskApi.move(activeId, { columnId: targetCol, sort: newSort }).catch(() => message.error("移动失败"));
  };

  const onAdd = async (colId: string, title: string) => {
    try {
      const t = await projectApi.createTask(id, { title, columnId: colId });
      setTasks((prev) => [...prev, t]);
    } catch { message.error("创建任务失败"); }
  };

  if (colQ.isLoading || taskQ.isLoading) return <div style={{ display: "grid", placeItems: "center", height: "100%" }}><Spin /></div>;

  const activeTask = tasks.find((t) => t.id === activeId);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ height: 56, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px", background: "var(--hive-surface)", borderBottom: "1px solid var(--hive-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{projQ.data?.project.name ?? "项目"}</Typography.Title>
          <Segmented value={view} onChange={(v) => setView(v as typeof view)} options={[{ label: "看板", value: "board" }, { label: "列表", value: "list" }, { label: "甘特", value: "gantt" }, { label: "仪表盘", value: "dash" }]} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {view === "board" && (
            <Select allowClear placeholder="按优先级筛选" style={{ width: 130 }} value={fPrio} onChange={setFPrio}
              options={[{ value: "urgent", label: "紧急" }, { value: "high", label: "高" }, { value: "mid", label: "中" }, { value: "low", label: "低" }]} />
          )}
          <Avatar.Group max={{ count: 5 }} size="small">
            {(projQ.data?.members ?? []).map((m: any) => (
              <Avatar key={m.userId} style={{ background: color.primary }}>{m.user?.name?.[0] ?? "?"}</Avatar>
            ))}
          </Avatar.Group>
          <Button icon={<UserAddOutlined />} onClick={openInvite}>邀请成员</Button>
        </div>
      </div>
      {view === "board" ? (
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={onDragEnd}>
        <div style={{ display: "flex", gap: 16, padding: 20, overflowX: "auto", flex: 1 }}>
          {(colQ.data ?? []).map((col) => (
            <ColumnView key={col.id} col={col} tasks={grouped[col.id] ?? []} onAdd={onAdd} onOpen={setOpenTaskId} />
          ))}
          <div style={{ width: 280, flexShrink: 0 }}>
            <Button type="dashed" block icon={<PlusOutlined />} onClick={addColumn} style={{ height: 40 }}>添加列</Button>
          </div>
        </div>
        <DragOverlay>{activeTask ? <Card task={activeTask} onOpen={() => {}} overlay /> : null}</DragOverlay>
      </DndContext>
      ) : view === "list" ? (
        <div style={{ padding: 20, overflow: "auto", flex: 1 }}>
          <Table
            rowKey="id"
            dataSource={tasks}
            pagination={false}
            onRow={(r) => ({ onClick: () => setOpenTaskId(r.id), style: { cursor: "pointer" } })}
            columns={[
              { title: "任务", dataIndex: "title" },
              { title: "状态", dataIndex: "columnId", render: (cid: string) => (colQ.data ?? []).find((c) => c.id === cid)?.name ?? "" },
              { title: "负责人", dataIndex: "assignee", render: (a: any) => a?.name ?? "—" },
              { title: "优先级", dataIndex: "priority", render: (p: string) => <Tag color={p === "urgent" || p === "high" ? "warning" : "default"}>{prioLabel[p] ?? p}</Tag> },
              { title: "到期", dataIndex: "dueAt", render: (d: string) => (d ? dayjs(d).format("MM-DD") : "—") },
            ]}
          />
        </div>
      ) : view === "gantt" ? (
        <div style={{ padding: 20, overflow: "auto", flex: 1 }}>
          <GanttChart tasks={tasks} onOpen={setOpenTaskId} />
        </div>
      ) : (
        <div style={{ padding: 24, overflow: "auto", flex: 1 }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            {([["总任务", tasks.length], ["已完成", tasks.filter((t) => t.status === "done").length], ["进行中", tasks.filter((t) => t.status === "doing").length], ["未完成", tasks.filter((t) => t.status !== "done").length]] as [string, number][]).map(([l, v]) => (
              <div key={l} style={{ flex: 1, background: "var(--hive-surface)", border: "1px solid var(--hive-border)", borderRadius: 12, padding: 18 }}>
                <div style={{ color: "var(--hive-muted)", fontSize: 13 }}>{l}</div>
                <div style={{ fontSize: 28, fontWeight: 600, color: "var(--hive-ink)" }}>{v}</div>
              </div>
            ))}
          </div>
          <BarChart title="按看板列分布" data={(colQ.data ?? []).map((c) => ({ label: c.name, value: (grouped[c.id] ?? []).length }))} />
          <BarChart title="按优先级分布" data={["urgent", "high", "mid", "low"].map((p) => ({ label: prioLabel[p], value: tasks.filter((t) => t.priority === p).length, color: color.prio[p] }))} />
        </div>
      )}

      <TaskDetail taskId={openTaskId} onClose={() => setOpenTaskId(null)} onChanged={refresh} />

      <Modal title="邀请成员" open={inviteOpen} onCancel={() => setInviteOpen(false)} onOk={doInvite} okText="邀请" okButtonProps={{ disabled: !pick }}>
        <Select
          showSearch style={{ width: "100%", marginTop: 12 }} placeholder="按姓名/邮箱搜索用户"
          value={pick} onChange={setPick}
          filterOption={false}
          onSearch={(kw) => userApi.search(kw).then(setAllUsers)}
          options={allUsers.map((u) => ({ value: u.id, label: `${u.name}（${u.email}）` }))}
        />
      </Modal>
    </div>
  );
}
