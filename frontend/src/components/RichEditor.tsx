import { useEffect, useRef } from "react";
import { Button, Space, Tooltip, message } from "antd";
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined, UnorderedListOutlined, OrderedListOutlined,
  CodeOutlined, FontSizeOutlined,
} from "@ant-design/icons";
import { docApi } from "@/api";

// 轻量富文本编辑器：contentEditable + 格式工具栏（HTML 存入 contentJson）。
export default function RichEditor({ docId, initial }: { docId: string; initial: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.innerHTML = initial || ""; }, [docId, initial]);

  const cmd = (c: string, val?: string) => { document.execCommand(c, false, val); ref.current?.focus(); };
  const save = async () => {
    await docApi.update(docId, { contentJson: ref.current?.innerHTML || "" });
    message.success("已保存");
  };

  const tools: [string, React.ReactNode, () => void][] = [
    ["加粗", <BoldOutlined />, () => cmd("bold")],
    ["斜体", <ItalicOutlined />, () => cmd("italic")],
    ["下划线", <UnderlineOutlined />, () => cmd("underline")],
    ["标题", <FontSizeOutlined />, () => cmd("formatBlock", "<h2>")],
    ["无序列表", <UnorderedListOutlined />, () => cmd("insertUnorderedList")],
    ["有序列表", <OrderedListOutlined />, () => cmd("insertOrderedList")],
    ["代码块", <CodeOutlined />, () => cmd("formatBlock", "<pre>")],
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Space.Compact>
          {tools.map(([title, icon, fn]) => (
            <Tooltip key={title} title={title}><Button icon={icon} onClick={fn} /></Tooltip>
          ))}
          <Tooltip title="引用"><Button onClick={() => cmd("formatBlock", "<blockquote>")}>❝</Button></Tooltip>
          <Tooltip title="分割线"><Button onClick={() => cmd("insertHorizontalRule")}>―</Button></Tooltip>
        </Space.Compact>
        <Button type="primary" onClick={save}>保存</Button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        style={{ minHeight: 400, outline: "none", fontSize: 16, lineHeight: 1.8, color: "var(--hive-ink)" }}
      />
    </div>
  );
}
