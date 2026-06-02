import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Col, Row, Tag, Typography, message } from "antd";
import { AppstoreOutlined, CheckOutlined } from "@ant-design/icons";
import { appApi, type AppItem } from "@/api";
import { color } from "@/theme/tokens";

export default function AppStore() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["apps"], queryFn: appApi.list });

  const toggle = async (a: AppItem) => {
    try {
      await (a.installed ? appApi.uninstall(a.key) : appApi.install(a.key));
      message.success(a.installed ? "已卸载" : "已安装");
      qc.invalidateQueries({ queryKey: ["apps"] });
    } catch { message.error("操作失败"); }
  };

  return (
    <div style={{ padding: 28 }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>应用市场</Typography.Title>
      <Typography.Paragraph type="secondary">为团队按需启用插件与第三方集成。</Typography.Paragraph>
      <Row gutter={[16, 16]}>
        {(listQ.data ?? []).map((a) => (
          <Col key={a.key} xs={24} sm={12} lg={8} xl={6}>
            <Card>
              <div style={{ display: "flex", gap: 12, alignItems: "start" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--hive-primary-soft)", display: "grid", placeItems: "center", color: color.primary, flexShrink: 0 }}>
                  <AppstoreOutlined style={{ fontSize: 22 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--hive-ink)" }}>{a.name}</div>
                  <Tag style={{ marginTop: 2 }}>{a.category}</Tag>
                </div>
              </div>
              <div style={{ color: "var(--hive-muted)", fontSize: 13, margin: "12px 0", minHeight: 38 }}>{a.desc}</div>
              <Button block type={a.installed ? "default" : "primary"} icon={a.installed ? <CheckOutlined /> : undefined} onClick={() => toggle(a)}>
                {a.installed ? "已安装 · 卸载" : "安装"}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
