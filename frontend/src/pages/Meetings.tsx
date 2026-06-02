import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Empty, Form, Input, List, Modal, Typography, message } from "antd";
import { VideoCameraOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { meetingApi, type Meeting } from "@/api";
import { color } from "@/theme/tokens";

const roomUrl = (room: string) => `https://meet.jit.si/${room}`;

export default function Meetings() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const listQ = useQuery({ queryKey: ["meetings"], queryFn: meetingApi.list });

  const create = useMutation({
    mutationFn: (title: string) => meetingApi.create(title),
    onSuccess: (m: Meeting) => {
      setOpen(false); form.resetFields();
      qc.invalidateQueries({ queryKey: ["meetings"] });
      window.open(roomUrl(m.room), "_blank");
    },
    onError: () => message.error("创建失败"),
  });

  return (
    <div style={{ padding: 28, maxWidth: 820 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>视频会议</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>发起会议</Button>
      </div>

      <Card>
        {(listQ.data?.length ?? 0) === 0 ? (
          <Empty description="还没有会议，点「发起会议」开始" />
        ) : (
          <List
            dataSource={listQ.data}
            renderItem={(m) => (
              <List.Item actions={[<Button key="j" type="primary" ghost onClick={() => window.open(roomUrl(m.room), "_blank")}>加入</Button>]}>
                <List.Item.Meta
                  avatar={<div style={{ width: 40, height: 40, borderRadius: 10, background: color.primary, display: "grid", placeItems: "center", color: "#fff" }}><VideoCameraOutlined /></div>}
                  title={m.title}
                  description={`发起人 ${m.host?.name ?? "—"} · 房间 ${m.room} · ${dayjs(m.createdAt).format("MM-DD HH:mm")}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal title="发起会议" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={create.isPending} okText="创建并加入">
        <Form form={form} layout="vertical" onFinish={(v) => create.mutate(v.title)} style={{ marginTop: 12 }}>
          <Form.Item name="title" label="会议主题" rules={[{ required: true, message: "请输入主题" }]}>
            <Input placeholder="例如：产品周会" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
