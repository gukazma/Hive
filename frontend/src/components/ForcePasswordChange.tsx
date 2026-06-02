import { Alert, Form, Input, Modal, message } from "antd";
import { authApi } from "@/api";
import { useAuth } from "@/stores/auth";

// 当用户被标记 mustChangePassword（如初始管理员）时，强制其修改密码后才能继续。
export default function ForcePasswordChange() {
  const { user, setUser } = useAuth();
  const [form] = Form.useForm();
  const open = !!user?.mustChangePassword;

  const submit = async () => {
    const v = await form.validateFields();
    try {
      await authApi.changePassword({ oldPassword: v.oldPassword, newPassword: v.newPassword });
      const me = await authApi.me();
      setUser(me);
      message.success("密码已修改");
      form.resetFields();
    } catch (e: any) {
      message.error(typeof e === "string" ? e : "修改失败");
    }
  };

  return (
    <Modal
      open={open}
      title="请先修改初始密码"
      okText="确认修改"
      cancelButtonProps={{ style: { display: "none" } }}
      closable={false}
      maskClosable={false}
      keyboard={false}
      onOk={submit}
    >
      <Alert type="warning" showIcon message="为了账号安全，首次登录需修改默认密码后才能继续使用。" style={{ marginBottom: 16 }} />
      <Form form={form} layout="vertical">
        <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true, message: "请输入当前密码" }]}>
          <Input.Password placeholder="默认管理员为 admin" />
        </Form.Item>
        <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 6, message: "至少 6 位" }]}>
          <Input.Password placeholder="设置新密码" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="确认新密码"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "请再次输入" },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue("newPassword") === value ? Promise.resolve() : Promise.reject(new Error("两次密码不一致")),
            }),
          ]}
        >
          <Input.Password placeholder="再次输入新密码" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
