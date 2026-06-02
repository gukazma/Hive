import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Calendar as AntCalendar, Card, Form, Input, Modal, Statistic, Tag, Typography, message } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { calendarApi, type CalendarEvent } from "@/api";
import { color } from "@/theme/tokens";

export default function CalendarPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selDate, setSelDate] = useState("");
  const [form] = Form.useForm();

  const statusQ = useQuery({ queryKey: ["checkin"], queryFn: calendarApi.status });
  const eventsQ = useQuery({ queryKey: ["events"], queryFn: () => calendarApi.events() });

  const byDate = useMemo(() => {
    const m: Record<string, CalendarEvent[]> = {};
    (eventsQ.data ?? []).forEach((e) => (m[e.date] ??= []).push(e));
    return m;
  }, [eventsQ.data]);

  const doCheckin = async () => {
    await calendarApi.checkin();
    message.success("打卡成功");
    qc.invalidateQueries({ queryKey: ["checkin"] });
  };

  const onSelect = (d: Dayjs) => { setSelDate(d.format("YYYY-MM-DD")); form.resetFields(); setOpen(true); };

  const create = async (v: any) => {
    await calendarApi.createEvent({ title: v.title, date: selDate, content: v.content });
    message.success("日程已添加");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const cellRender = (current: Dayjs, info: { type: string }) => {
    if (info.type !== "date") return null;
    const items = byDate[current.format("YYYY-MM-DD")] ?? [];
    return (
      <div style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.slice(0, 3).map((e) => (
          <div key={e.id}><Badge color={color.primary} text={<span style={{ fontSize: 12 }}>{e.title}</span>} /></div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: 28 }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>日历</Typography.Title>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <Statistic title="本月打卡" value={statusQ.data?.monthCount ?? 0} suffix="天" />
          {statusQ.data?.checkedToday ? (
            <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontSize: 14, padding: "4px 12px" }}>今日已打卡</Tag>
          ) : (
            <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={doCheckin}>立即打卡</Button>
          )}
        </div>
      </Card>

      <Card>
        <AntCalendar cellRender={cellRender} onSelect={onSelect} />
      </Card>

      <Modal title={`新建日程 · ${selDate}`} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="添加">
        <Form form={form} layout="vertical" onFinish={create} style={{ marginTop: 12 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
            <Input placeholder="例如：产品评审会" />
          </Form.Item>
          <Form.Item name="content" label="说明">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
