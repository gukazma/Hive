import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Empty, Input, List, Modal, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { searchApi, type SearchResult } from "@/api";

const typeLabel: Record<string, string> = { task: "任务", doc: "文档", project: "项目", message: "消息", user: "成员" };

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("hive-open-search", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("hive-open-search", onOpen); };
  }, []);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const id = setTimeout(() => { searchApi.query(q).then(setResults).catch(() => {}); }, 250);
    return () => clearTimeout(id);
  }, [q]);

  const go = (r: SearchResult) => { setOpen(false); setQ(""); navigate(r.link); };

  return (
    <Modal open={open} onCancel={() => setOpen(false)} footer={null} closable={false} width={560} styles={{ body: { padding: 0 } }} style={{ top: 96 }}>
      <Input size="large" variant="borderless" autoFocus prefix={<SearchOutlined style={{ color: "var(--hive-muted)" }} />}
        placeholder="搜索任务、文档、项目、消息、成员…" value={q} onChange={(e) => setQ(e.target.value)}
        style={{ padding: 14, borderBottom: "1px solid var(--hive-border)" }} />
      <div style={{ maxHeight: 380, overflow: "auto", padding: 8 }}>
        {q && results.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无结果" />
        ) : (
          <List
            dataSource={results}
            locale={{ emptyText: "输入关键词搜索" }}
            renderItem={(r) => (
              <List.Item onClick={() => go(r)} style={{ cursor: "pointer", padding: "10px 12px", borderRadius: 8 }}>
                <List.Item.Meta title={<span style={{ color: "var(--hive-ink)" }}>{r.title}</span>} description={r.subtitle} />
                <Tag>{typeLabel[r.type] ?? r.type}</Tag>
              </List.Item>
            )}
          />
        )}
      </div>
    </Modal>
  );
}
