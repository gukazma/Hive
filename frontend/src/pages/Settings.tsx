import { useEffect } from "react";
import { Button, Card, Form, Input, Switch, Typography, message } from "antd";
import { authApi } from "@/api";
import { useAuth } from "@/stores/auth";
import { useTheme } from "@/stores/theme";

export default function Settings() {
  const { user, setUser } = useAuth();
  const { dark, toggle } = useTheme();
  const [profileForm] = Form.useForm();
  const [pwdForm] = Form.useForm();

  useEffect(() => { if (user) profileForm.setFieldsValue({ name: user.name }); }, [user, profileForm]);

  const saveProfile = async (v: any) => {
    try { const u = await authApi.updateProfile({ name: v.name }); setUser(u); message.success("资料已更新"); }
    catch (e: any) { message.error(typeof e === "string" ? e : "更新失败"); }
  };
  const savePwd = async (v: any) => {
    try {
      await authApi.changePassword({ oldPassword: v.oldPassword, newPassword: v.newPassword });
      message.success("密码已修改"); pwdForm.resetFields();
    } catch (e: any) { message.error(typeof e === "string" ? e : "修改失败"); }
  };

  return (
    <div style={{ padding: 28, maxWidth: 680 }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>个人设置</Typography.Title>

      <Card title="基本资料" style={{ marginBottom: 20 }}>
        <Form form={profileForm} layout="vertical" onFinish={saveProfile}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: "请输入姓名" }]}>
            <Input style={{ maxWidth: 320 }} />
          </Form.Item>
          <Form.Item label="邮箱">
            <Input value={user?.email} disabled style={{ maxWidth: 320 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit">保存资料</Button>
        </Form>
      </Card>

      <Card title="修改密码" style={{ marginBottom: 20 }}>
        <Form form={pwdForm} layout="vertical" onFinish={savePwd}>
          <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true, message: "请输入当前密码" }]}>
            <Input.Password style={{ maxWidth: 320 }} />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 6, message: "至少 6 位" }]}>
            <Input.Password style={{ maxWidth: 320 }} />
          </Form.Item>
          <Form.Item name="confirm" label="确认新密码" dependencies={["newPassword"]}
            rules={[{ required: true, message: "请再次输入" }, ({ getFieldValue }) => ({ validator: (_, v) => !v || getFieldValue("newPassword") === v ? Promise.resolve() : Promise.reject(new Error("两次密码不一致")) })]}>
            <Input.Password style={{ maxWidth: 320 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit">修改密码</Button>
        </Form>
      </Card>

      <Card title="外观">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>深色模式</span>
          <Switch checked={dark} onChange={toggle} />
        </div>
      </Card>
    </div>
  );
}
