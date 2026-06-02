import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Form, Input, Typography, message } from "antd";
import { MailOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { authApi } from "@/api";
import { useAuth } from "@/stores/auth";
import { color } from "@/theme/tokens";
import { useI18n } from "@/i18n";

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  const onFinish = async (v: any) => {
    setLoading(true);
    try {
      const res = mode === "login" ? await authApi.login(v) : await authApi.register(v);
      setAuth(res.token, res.user);
      navigate("/");
    } catch (e: any) {
      message.error(typeof e === "string" ? e : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div
        style={{
          width: 560, background: color.sidebarBg, color: "#fff",
          padding: 56, display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: color.honey, display: "grid", placeItems: "center", color: color.sidebarBg, fontWeight: 700, fontSize: 22 }}>H</div>
          <span style={{ fontSize: 26, fontWeight: 600 }}>Hive</span>
        </div>
        <div>
          <h1 style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
            {t("login.slogan").split("\n").map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}
          </h1>
          <p style={{ fontSize: 16, color: color.sidebarText, marginTop: 20, lineHeight: 1.7 }}>
            {t("login.tagline")}
          </p>
        </div>
        <div style={{ color: color.sidebarText, fontSize: 14 }}>看板 · 沟通 · 文档 · 文件</div>
      </div>

      <div style={{ flex: 1, display: "grid", placeItems: "center", background: "#fff" }}>
        <div style={{ width: 360 }}>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            {mode === "login" ? t("login.welcome") : t("login.createTitle")}
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            {mode === "login" ? t("login.subtitleLogin") : t("login.subtitleReg")}
          </Typography.Paragraph>
          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            {mode === "register" && (
              <Form.Item name="name" label={t("login.name")} rules={[{ required: true, message: "required" }]}>
                <Input prefix={<UserOutlined />} placeholder={t("login.name")} size="large" />
              </Form.Item>
            )}
            <Form.Item name="email" label={t("login.email")} rules={[{ required: true, type: "email", message: "invalid email" }]}>
              <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
            </Form.Item>
            <Form.Item name="password" label={t("login.password")} rules={mode === "register" ? [{ required: true, min: 6, message: "min 6" }] : [{ required: true, message: t("login.password") }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              {mode === "login" ? t("login.signin") : t("login.signup")}
            </Button>
          </Form>
          <div style={{ textAlign: "center", marginTop: 16, color: "var(--hive-muted)" }}>
            {mode === "login" ? t("login.noAccount") : t("login.hasAccount")}
            <a onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ marginLeft: 4 }}>
              {mode === "login" ? t("login.toRegister") : t("login.toLogin")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
