import { useEffect, useRef, useState } from "react";
import { Button, Space, message } from "antd";
import { PlusOutlined, NodeIndexOutlined } from "@ant-design/icons";
import { docApi } from "@/api";
import { color } from "@/theme/tokens";

interface Node { id: string; x: number; y: number; text: string; }
interface Edge { from: string; to: string; }

const NW = 130, NH = 46;

// 思维导图 / 流程图白板：可拖拽节点 + 连线 + 保存。
export default function Whiteboard({ docId, initial }: { docId: string; initial: string }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; offX: number; offY: number; moved: boolean } | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);

  useEffect(() => {
    try { const p = JSON.parse(initial); setNodes(p.nodes ?? []); setEdges(p.edges ?? []); }
    catch { setNodes([]); setEdges([]); }
  }, [docId, initial]);

  const addNode = () => {
    const id = "n_" + (nodes.length + 1) + "_" + nodes.reduce((a, n) => Math.max(a, +n.id.split("_")[1] || 0), 0);
    setNodes((n) => [...n, { id, x: 60 + (n.length % 5) * 150, y: 60 + Math.floor(n.length / 5) * 90, text: "新节点" }]);
  };

  const onNodeDown = (e: React.PointerEvent, n: Node) => {
    e.stopPropagation();
    if (connectMode) {
      if (!connectFrom) setConnectFrom(n.id);
      else { if (connectFrom !== n.id) setEdges((ed) => [...ed, { from: connectFrom, to: n.id }]); setConnectFrom(null); }
      return;
    }
    const rect = canvasRef.current!.getBoundingClientRect();
    drag.current = { id: n.id, offX: e.clientX - rect.left - n.x, offY: e.clientY - rect.top - n.y, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current.moved = true;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left - drag.current.offX;
    const y = e.clientY - rect.top - drag.current.offY;
    setNodes((ns) => ns.map((n) => (n.id === drag.current!.id ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n)));
  };
  const onUp = () => { drag.current = null; };

  const editText = (n: Node) => {
    const v = window.prompt("节点文字", n.text);
    if (v != null) setNodes((ns) => ns.map((x) => (x.id === n.id ? { ...x, text: v } : x)));
  };

  const save = async () => {
    await docApi.update(docId, { contentJson: JSON.stringify({ nodes, edges }) });
    message.success("白板已保存");
  };

  const center = (id: string) => { const n = nodes.find((x) => x.id === id); return n ? { x: n.x + NW / 2, y: n.y + NH / 2 } : { x: 0, y: 0 }; };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <Space>
          <Button icon={<PlusOutlined />} onClick={addNode}>添加节点</Button>
          <Button type={connectMode ? "primary" : "default"} icon={<NodeIndexOutlined />} onClick={() => { setConnectMode((v) => !v); setConnectFrom(null); }}>
            {connectMode ? "连线中（点两个节点）" : "连线"}
          </Button>
        </Space>
        <Button type="primary" onClick={save}>保存</Button>
      </div>
      <div ref={canvasRef} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        style={{ position: "relative", height: 520, background: "var(--hive-bg-subtle)", border: "1px solid var(--hive-border)", borderRadius: 8, overflow: "hidden" }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {edges.map((e, i) => {
            const a = center(e.from), b = center(e.to);
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color.primary} strokeWidth={2} />;
          })}
        </svg>
        {nodes.map((n) => (
          <div key={n.id}
            onPointerDown={(e) => onNodeDown(e, n)}
            onDoubleClick={() => editText(n)}
            style={{
              position: "absolute", left: n.x, top: n.y, width: NW, minHeight: NH,
              display: "grid", placeItems: "center", padding: 8, textAlign: "center",
              background: "var(--hive-surface)", border: `2px solid ${connectFrom === n.id ? color.honey : color.primary}`,
              borderRadius: 10, cursor: connectMode ? "crosshair" : "grab", boxShadow: "0 1px 4px rgba(15,23,42,.1)",
              color: "var(--hive-ink)", fontSize: 13, userSelect: "none",
            }}>
            {n.text}
          </div>
        ))}
        {nodes.length === 0 && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--hive-muted)" }}>点「添加节点」开始绘制思维导图 / 流程图，双击节点改名，「连线」连接节点</div>}
      </div>
    </div>
  );
}
