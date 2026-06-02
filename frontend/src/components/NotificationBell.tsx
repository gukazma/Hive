import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Empty, List, Popover, Tabs } from "antd";
import { BellOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { notifApi, wsURL, type Notification } from "@/api";
import { useAuth } from "@/stores/auth";
import { color } from "@/theme/tokens";

const typeText: Record<string, string> = { assigned: "任务指派", comment: "评论", mention: "提及", member: "项目", system: "系统" };

export default function NotificationBell() {
  const token = useAuth((s) => s.token);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const listQ = useQuery({ queryKey: ["notifications"], queryFn: notifApi.list, refetchInterval: 30000 });
  const countQ = useQuery({ queryKey: ["notif-unread"], queryFn: notifApi.unreadCount, refetchInterval: 30000 });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["notif-unread"] }); };

  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(wsURL(token));
    ws.onmessage = (e) => {
      try { if (JSON.parse(e.data).type === "notification") refresh(); } catch {}
    };
    wsRef.current = ws;
    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onItem = async (n: Notification) => {
    if (!n.read) { await notifApi.markRead(n.id); refresh(); }
    if (n.link) { setOpen(false); navigate(n.link); }
  };
  const allRead = async () => { await notifApi.markAllRead(); refresh(); };

  const unread = countQ.data?.count ?? 0;
  const items = listQ.data ?? [];

  const content = (
    <div style={{ width: 340 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <b style={{ color: "var(--hive-ink)" }}>通知</b>
        <Button type="link" size="small" onClick={allRead} disabled={!unread}>全部已读</Button>
      </div>
      <Tabs
        size="small"
        items={[
          { key: "all", label: "全部", children: <NotifList items={items} onItem={onItem} /> },
          { key: "unread", label: `未读${unread ? ` (${unread})` : ""}`, children: <NotifList items={items.filter((n) => !n.read)} onItem={onItem} /> },
        ]}
      />
    </div>
  );

  return (
    <Popover content={content} trigger="click" open={open} onOpenChange={setOpen} placement="rightBottom">
      <Badge count={unread} size="small" offset={[-2, 2]}>
        <BellOutlined style={{ color: open ? color.honey : color.sidebarText, fontSize: 20, cursor: "pointer" }} />
      </Badge>
    </Popover>
  );
}

function NotifList({ items, onItem }: { items: Notification[]; onItem: (n: Notification) => void }) {
  if (!items.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知" />;
  return (
    <List
      style={{ maxHeight: 360, overflow: "auto" }}
      dataSource={items}
      renderItem={(n) => (
        <List.Item style={{ cursor: "pointer", background: n.read ? undefined : "var(--hive-primary-soft)", padding: "10px 8px", borderRadius: 6 }} onClick={() => onItem(n)}>
          <List.Item.Meta
            title={<span style={{ fontSize: 14 }}>{n.title}</span>}
            description={
              <div>
                <div style={{ fontSize: 13, color: "var(--hive-body)" }}>{n.body}</div>
                <div style={{ fontSize: 11, color: "var(--hive-muted)" }}>{typeText[n.type] ?? n.type} · {dayjs(n.createdAt).format("MM-DD HH:mm")}</div>
              </div>
            }
          />
        </List.Item>
      )}
    />
  );
}
