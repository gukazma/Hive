import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Col, Empty, Form, Input, Modal, Row, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { projectApi, type Project } from "@/api";
import { useAuth } from "@/stores/auth";
import { useI18n } from "@/i18n";

export default function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: projects = [], isLoading } = useQuery({ queryKey: ["projects"], queryFn: projectApi.list });

  const create = useMutation({
    mutationFn: (b: any) => projectApi.create(b),
    onSuccess: (p: Project) => {
      message.success("项目已创建");
      setOpen(false);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate(`/projects/${p.id}`);
    },
    onError: () => message.error("创建失败"),
  });

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            {t("dash.hello")}{user ? `，${user.name}` : ""} 👋
          </Typography.Title>
          <Typography.Text type="secondary">{t("dash.pick")}</Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          {t("dash.newProject")}
        </Button>
      </div>

      {!isLoading && projects.length === 0 ? (
        <Empty description="还没有项目，创建第一个吧" style={{ marginTop: 80 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新建项目</Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {projects.map((p) => (
            <Col key={p.id} xs={24} sm={12} md={8} lg={6}>
              <Card hoverable onClick={() => navigate(`/projects/${p.id}`)} loading={isLoading}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: p.color || "#4F46E5", display: "grid", placeItems: "center", color: "#fff", fontWeight: 600 }}>
                    {p.name[0]}
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontWeight: 600, color: "var(--hive-ink)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--hive-muted)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{p.description || "暂无描述"}</div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal title="新建项目" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={create.isPending} okText="创建">
        <Form form={form} layout="vertical" onFinish={(v) => create.mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: "请输入名称" }]}>
            <Input placeholder="例如：产品设计冲刺" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="一句话介绍这个项目" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
