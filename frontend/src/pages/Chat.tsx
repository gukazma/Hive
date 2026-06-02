import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, Badge, Button, Empty, Input, Modal, Popover, Select, Spin, Upload, message } from "antd";
import { SendOutlined, PlusOutlined, PaperClipOutlined, PictureOutlined, SmileOutlined } from "@ant-design/icons";
import { fileApi, imApi, userApi, wsURL, type Message, type User } from "@/api";
import { useAuth } from "@/stores/auth";
import { color } from "@/theme/tokens";

export default function Chat() {
  const { token, user } = useAuth();
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [memberUsers, setMemberUsers] = useState<User[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const qc = useQueryClient();
  const convQ = useQuery({ queryKey: ["conversations"], queryFn: imApi.conversations });
  const [newOpen, setNewOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [convName, setConvName] = useState("");

  const openNew = () => { setNewOpen(true); userApi.search().then(setUsers); };
  const createConv = async () => {
    if (!picked.length) { message.warning("请选择成员"); return; }
    const conv = await imApi.create({ name: convName || undefined, memberIds: picked });
    setNewOpen(false); setPicked([]); setConvName("");
    await qc.invalidateQueries({ queryKey: ["conversations"] });
    setActive(conv.id);
  };

  useEffect(() => {
    if (!active && convQ.data?.length) setActive(convQ.data[0].id);
  }, [convQ.data, active]);

  useEffect(() => {
    if (active) {
      imApi.messages(active).then(setMsgs);
      imApi.markRead(active).then(() => qc.invalidateQueries({ queryKey: ["conversations"] })).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(wsURL(token));
    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "message") {
          setMsgs((prev) => (payload.message.conversationId === activeRef.current ? [...prev, payload.message] : prev));
        } else if (payload.type === "recall") {
          setMsgs((prev) => prev.map((m) => (m.id === payload.messageId ? { ...m, recalled: true, content: "" } : m)));
        }
      } catch {}
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [token]);

  // 用 ref 让 ws 回调读到最新选中会话
  const activeRef = useRef<string | null>(null);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const sendMsg = (content: string, type = "text", mentions: string[] = []) => {
    if (!content || !active || wsRef.current?.readyState !== WebSocket.OPEN) return false;
    wsRef.current.send(JSON.stringify({ conversationId: active, content, type, mentions }));
    return true;
  };
  const send = () => { if (text.trim() && sendMsg(text.trim(), "text", mentions)) { setText(""); setMentions([]); } };
  const recall = async (mid: string) => { try { await imApi.recall(mid); setMsgs((prev) => prev.map((m) => (m.id === mid ? { ...m, recalled: true, content: "" } : m))); } catch { message.error("撤回失败"); } };
  const uploadAndSend = async (file: File, kind: "file" | "image") => {
    const fd = new FormData(); fd.append("file", file);
    try {
      const f = await fileApi.upload(fd);
      sendMsg(JSON.stringify({ name: f.name, url: `/uploads/${f.storageKey}`, mime: f.mime }), kind);
    } catch { message.error("上传失败"); }
    return false;
  };
  const EMOJIS = ["😀", "😄", "👍", "🎉", "❤️", "🙏", "🚀", "✅", "🔥", "😅", "🤝", "💡"];
  const renderContent = (m: Message) => {
    if (m.type === "image" || m.type === "file") {
      try {
        const o = JSON.parse(m.content);
        if (m.type === "image") return <img src={o.url} alt={o.name} style={{ maxWidth: 220, borderRadius: 8, display: "block" }} />;
        return <a href={o.url} target="_blank" rel="noreferrer">📎 {o.name}</a>;
      } catch { return m.content; }
    }
    return m.content;
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ width: 300, borderRight: "1px solid var(--hive-border)", background: "var(--hive-surface)", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 18, color: "var(--hive-ink)" }}>消息</span>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openNew}>发起</Button>
        </div>
        {convQ.isLoading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 40 }}><Spin /></div>
        ) : (
          (convQ.data ?? []).map((c) => (
            <div
              key={c.id}
              onClick={() => setActive(c.id)}
              style={{
                display: "flex", gap: 10, alignItems: "center", padding: "10px 16px", cursor: "pointer",
                background: active === c.id ? "var(--hive-primary-soft)" : "transparent",
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: color.primary, display: "grid", placeItems: "center", color: "#fff", fontWeight: 600 }}>{c.name[0]}</div>
              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, color: "var(--hive-ink)" }}>{c.name}</span>
                {!!c.unread && <Badge count={c.unread} size="small" />}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!active ? (
          <div style={{ display: "grid", placeItems: "center", height: "100%" }}><Empty description="选择一个会话开始聊天" /></div>
        ) : (
          <>
            <div style={{ height: 56, borderBottom: "1px solid var(--hive-border)", display: "flex", alignItems: "center", padding: "0 20px", fontWeight: 600, fontSize: 16, color: "var(--hive-ink)", background: "var(--hive-surface)" }}>
              {convQ.data?.find((c) => c.id === active)?.name ?? "会话"}
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
              {msgs.map((m) => {
                const mine = m.sender?.id === user?.id;
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", gap: 10, marginBottom: 14 }}>
                    {!mine && <Avatar style={{ background: color.success }}>{m.sender?.name?.[0] ?? "?"}</Avatar>}
                    {mine && !m.recalled && <a onClick={() => recall(m.id)} style={{ fontSize: 11, color: "var(--hive-muted)", alignSelf: "center" }}>撤回</a>}
                    <div style={{ maxWidth: 420, padding: "10px 14px", borderRadius: 12, background: mine ? color.primary : "var(--hive-surface)", color: mine ? "#fff" : "var(--hive-ink)", border: mine ? "none" : "1px solid var(--hive-border)" }}>
                      {!mine && <div style={{ fontSize: 12, color: "var(--hive-muted)", marginBottom: 2 }}>{m.sender?.name}</div>}
                      {m.recalled ? <span style={{ fontStyle: "italic", opacity: 0.7 }}>[消息已撤回]</span> : renderContent(m)}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <div style={{ padding: 16, borderTop: "1px solid var(--hive-border)", background: "var(--hive-surface)", display: "flex", gap: 10, alignItems: "center" }}>
              <Upload showUploadList={false} beforeUpload={(f) => uploadAndSend(f as File, "file")}>
                <Button type="text" icon={<PaperClipOutlined />} />
              </Upload>
              <Upload showUploadList={false} accept="image/*" beforeUpload={(f) => uploadAndSend(f as File, "image")}>
                <Button type="text" icon={<PictureOutlined />} />
              </Upload>
              <Popover trigger="click" content={
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 4, fontSize: 20, cursor: "pointer", maxWidth: 200 }}>
                  {EMOJIS.map((e) => <span key={e} onClick={() => setText((t) => t + e)}>{e}</span>)}
                </div>
              }>
                <Button type="text" icon={<SmileOutlined />} />
              </Popover>
              <Popover trigger="click" onOpenChange={(o) => { if (o) userApi.search().then(setMemberUsers); }} content={
                <div style={{ maxWidth: 200, maxHeight: 240, overflow: "auto" }}>
                  {memberUsers.map((u) => (
                    <div key={u.id} onClick={() => { setText((t) => t + `@${u.name} `); setMentions((m) => [...m, u.id]); }} style={{ padding: "6px 8px", cursor: "pointer", color: "var(--hive-ink)" }}>{u.name}</div>
                  ))}
                </div>
              }>
                <Button type="text" style={{ fontWeight: 600 }}>@</Button>
              </Popover>
              <Input value={text} onChange={(e) => setText(e.target.value)} onPressEnter={send} placeholder="输入消息，Enter 发送…" size="large" />
              <button onClick={send} style={{ background: color.primary, color: "#fff", border: "none", borderRadius: 8, width: 48, height: 40, cursor: "pointer" }}><SendOutlined /></button>
            </div>
          </>
        )}
      </div>

      <Modal title="发起会话" open={newOpen} onCancel={() => setNewOpen(false)} onOk={createConv} okText="创建">
        <Input placeholder="会话名称（群聊建议填写）" value={convName} onChange={(e) => setConvName(e.target.value)} style={{ marginBottom: 12 }} />
        <Select
          mode="multiple" showSearch style={{ width: "100%" }} placeholder="选择成员（按姓名/邮箱搜索）"
          value={picked} onChange={setPicked} filterOption={false}
          onSearch={(kw) => userApi.search(kw).then(setUsers)}
          options={users.map((u) => ({ value: u.id, label: `${u.name}（${u.email}）` }))}
        />
      </Modal>
    </div>
  );
}
