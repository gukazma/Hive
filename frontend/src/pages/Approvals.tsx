import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Empty, Form, Input, Modal, Select, Space, Tabs, Tag, Typography, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { approvalApi, userApi, type Approval, type User } from "@/api";

const typeLabel: Record<string, string> = { leave: "请假", expense: "报销", purchase: "采购", general: "通用" };
const statusTag: Record<string, { color: string; text: string }> = {
  pending: { color: "orange", text: "待审批" }, approved: { color: "green", text: "已通过" }, rejected: { color: "red", text: "已驳回" },
};

export default function Approvals() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"mine" | "todo">("mine");
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [form] = Form.useForm();

  const listQ = useQuery({ queryKey: ["approvals", tab], queryFn: () => approvalApi.list(tab) });

  const create = useMutation({
    mutationFn: (b: any) => approvalApi.create(b),
    onSuccess: () => { message.success("已提交审批"); setOpen(false); form.resetFields(); qc.invalidateQueries({ queryKey: ["approvals"] }); },
    onError: () => message.error("提交失败"),
  });
  const decide = async (id: string, action: "approve" | "reject") => {
    await approvalApi.decide(id, action);
    message.success(action === "approve" ? "已通过" : "已驳回");
    qc.invalidateQueries({ queryKey: ["approvals"] });
  };

  const openModal = () => { setOpen(true); userApi.search().then(setUsers); };

  const renderList = (items: Approval[] = []) => {
    if (!items.length) return <Empty description="暂无审批" style={{ marginTop: 60 }} />;
    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {items.map((a) => (
          <Card key={a.id} size="small">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 600, color: "var(--hive-ink)" }}>
                  <Tag>{typeLabel[a.type] ?? a.type}</Tag>{a.title}
                </div>
                {a.content && <div style={{ color: "var(--hive-body)", margin: "6px 0" }}>{a.content}</div>}
                <div style={{ fontSize: 12, color: "var(--hive-muted)" }}>
                  申请人 {a.applicant?.name ?? "—"} · 审批人 {a.approver?.name ?? "—"} · {dayjs(a.createdAt).format("MM-DD HH:mm")}
                  {a.comment ? ` · 批注：${a.comment}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "end", gap: 8 }}>
                <Tag color={statusTag[a.status]?.color}>{statusTag[a.status]?.text ?? a.status}</Tag>
                {tab === "todo" && a.status === "pending" && (
                  <Space>
                    <Button size="small" danger onClick={() => decide(a.id, "reject")}>驳回</Button>
                    <Button size="small" type="primary" onClick={() => decide(a.id, "approve")}>通过</Button>
                  </Space>
                )}
              </div>
            </div>
          </Card>
        ))}
      </Space>
    );
  };

  return (
    <div style={{ padding: 28, maxWidth: 860 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>审批</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>发起审批</Button>
      </div>

      <Tabs activeKey={tab} onChange={(k) => setTab(k as "mine" | "todo")}
        items={[
          { key: "mine", label: "我发起的", children: renderList(listQ.data) },
          { key: "todo", label: "待我审批", children: renderList(listQ.data) },
        ]}
      />

      <Modal title="发起审批" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={create.isPending} okText="提交">
        <Form form={form} layout="vertical" onFinish={(v) => create.mutate(v)} style={{ marginTop: 12 }}>
          <Form.Item name="type" label="类型" initialValue="general">
            <Select options={Object.entries(typeLabel).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
            <Input placeholder="例如：请假 2 天" />
          </Form.Item>
          <Form.Item name="content" label="说明">
            <Input.TextArea rows={3} placeholder="补充说明…" />
          </Form.Item>
          <Form.Item name="approverId" label="审批人" rules={[{ required: true, message: "请选择审批人" }]}>
            <Select showSearch filterOption={false} placeholder="搜索用户"
              onSearch={(kw) => userApi.search(kw).then(setUsers)}
              options={users.map((u) => ({ value: u.id, label: `${u.name}（${u.email}）` }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
