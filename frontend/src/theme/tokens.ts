// Hive 设计 Token（TS）—— 与 design-tokens.css 同源。
export const color = {
  honey: "#F59E0B",
  honeySoft: "#FEF3C7",
  primary: "#4F46E5",
  primaryHover: "#4338CA",
  success: "#16A34A",
  danger: "#DC2626",
  info: "#0EA5E9",
  sidebarBg: "#1E1B2E",
  sidebarHover: "#2A2640",
  sidebarText: "#A9A4C2",
  prio: { low: "#64748B", mid: "#0EA5E9", high: "#F59E0B", urgent: "#DC2626" } as Record<string, string>,
} as const;

export const radius = { sm: 6, md: 8, lg: 12, pill: 999 } as const;

// 任务优先级中文标签
export const prioLabel: Record<string, string> = { low: "低", mid: "中", high: "高", urgent: "紧急" };
