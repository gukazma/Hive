import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dropdown, Empty, Input, Spin } from "antd";
import { PlusOutlined, FileTextOutlined, ApartmentOutlined } from "@ant-design/icons";
import { docApi, type Doc } from "@/api";
import RichEditor from "@/components/RichEditor";
import Whiteboard from "@/components/Whiteboard";

export default function Docs() {
  const qc = useQueryClient();
  const [active, setActive] = useState<Doc | null>(null);
  const [title, setTitle] = useState("");

  const listQ = useQuery({ queryKey: ["docs"], queryFn: docApi.list });

  useEffect(() => {
    if (!active && listQ.data?.length) open(listQ.data[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listQ.data]);

  const open = async (d: Doc) => {
    const full = await docApi.get(d.id);
    setActive(full);
    setTitle(full.title);
  };

  const create = async (kind: "doc" | "board") => {
    const d = await docApi.create({ title: kind === "board" ? "未命名白板" : "未命名文档", kind });
    qc.invalidateQueries({ queryKey: ["docs"] });
    open(d);
  };

  const saveTitle = async () => {
    if (active && title !== active.title) {
      await docApi.update(active.id, { title });
      qc.invalidateQueries({ queryKey: ["docs"] });
    }
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ width: 280, borderRight: "1px solid var(--hive-border)", background: "var(--hive-surface)", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 18, color: "var(--hive-ink)" }}>文档</span>
          <Dropdown menu={{ items: [
            { key: "doc", icon: <FileTextOutlined />, label: "新建文档", onClick: () => create("doc") },
            { key: "board", icon: <ApartmentOutlined />, label: "新建白板（导图/流程图）", onClick: () => create("board") },
          ] }}>
            <Button size="small" type="primary" icon={<PlusOutlined />}>新建</Button>
          </Dropdown>
        </div>
        {listQ.isLoading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 40 }}><Spin /></div>
        ) : (
          (listQ.data ?? []).map((d) => (
            <div key={d.id} onClick={() => open(d)} style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 16px", cursor: "pointer", background: active?.id === d.id ? "var(--hive-primary-soft)" : "transparent", color: "var(--hive-body)" }}>
              {d.kind === "board" ? <ApartmentOutlined /> : <FileTextOutlined />} <span style={{ color: "var(--hive-ink)" }}>{d.title}</span>
            </div>
          ))
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {!active ? (
          <div style={{ display: "grid", placeItems: "center", height: "100%" }}><Empty description="新建或选择一个文档" /></div>
        ) : (
          <div style={{ maxWidth: 860, margin: "0 auto", padding: 40 }}>
            <Input variant="borderless" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle}
              style={{ fontSize: 28, fontWeight: 600, padding: 0, marginBottom: 20 }} />
            {active.kind === "board"
              ? <Whiteboard docId={active.id} initial={active.contentJson} />
              : <RichEditor docId={active.id} initial={active.contentJson} />}
          </div>
        )}
      </div>
    </div>
  );
}
