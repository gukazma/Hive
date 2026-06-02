import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Dropdown, Tooltip } from "antd";
import {
  AppstoreFilled, ProjectOutlined, MessageOutlined, FileTextOutlined,
  FolderOutlined, SettingOutlined, BulbOutlined, BulbFilled, AuditOutlined, CalendarOutlined, GlobalOutlined, SearchOutlined, AppstoreAddOutlined, VideoCameraOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/stores/auth";
import { useTheme } from "@/stores/theme";
import { useI18n } from "@/i18n";
import { authApi } from "@/api";
import { color } from "@/theme/tokens";
import ForcePasswordChange from "./ForcePasswordChange";
import NotificationBell from "./NotificationBell";
import CommandPalette from "./CommandPalette";

const navItems = [
  { key: "dash", icon: <AppstoreFilled />, i18nKey: "nav.dashboard", path: "/" },
  { key: "proj", icon: <ProjectOutlined />, i18nKey: "nav.projects", path: "/" },
  { key: "msg", icon: <MessageOutlined />, i18nKey: "nav.messages", path: "/messages" },
  { key: "doc", icon: <FileTextOutlined />, i18nKey: "nav.docs", path: "/docs" },
  { key: "file", icon: <FolderOutlined />, i18nKey: "nav.files", path: "/files" },
  { key: "approval", icon: <AuditOutlined />, i18nKey: "nav.approval", path: "/approvals" },
  { key: "calendar", icon: <CalendarOutlined />, i18nKey: "nav.calendar", path: "/calendar" },
  { key: "meetings", icon: <VideoCameraOutlined />, i18nKey: "nav.meetings", path: "/meetings" },
  { key: "apps", icon: <AppstoreAddOutlined />, i18nKey: "nav.apps", path: "/apps" },
];

function activeKey(pathname: string): string {
  if (pathname.startsWith("/projects")) return "proj";
  if (pathname.startsWith("/messages")) return "msg";
  if (pathname.startsWith("/docs")) return "doc";
  if (pathname.startsWith("/files")) return "file";
  if (pathname.startsWith("/approvals")) return "approval";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/meetings")) return "meetings";
  if (pathname.startsWith("/apps")) return "apps";
  if (pathname.startsWith("/admin")) return "admin";
  return "dash";
}

export default function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const current = activeKey(location.pathname);
  const { user, setUser, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { t, locale, setLocale } = useI18n();

  useEffect(() => {
    if (!user) authApi.me().then(setUser).catch(() => {});
  }, [user, setUser]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div
        style={{
          width: 64, background: color.sidebarBg, display: "flex",
          flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 8,
        }}
      >
        <div
          onClick={() => navigate("/")}
          style={{
            width: 38, height: 38, borderRadius: 10, background: color.honey,
            display: "grid", placeItems: "center", color: color.sidebarBg,
            fontWeight: 700, fontSize: 18, cursor: "pointer", marginBottom: 8,
          }}
        >
          H
        </div>
        <Tooltip title="搜索 (⌘K)" placement="right">
          <div onClick={() => window.dispatchEvent(new CustomEvent("hive-open-search"))}
            style={{ width: 48, height: 48, borderRadius: 8, display: "grid", placeItems: "center", fontSize: 18, cursor: "pointer", color: color.sidebarText }}>
            <SearchOutlined />
          </div>
        </Tooltip>
        {navItems.map((it) => {
          const on = current === it.key;
          return (
            <Tooltip key={it.key} title={t(it.i18nKey)} placement="right">
              <div
                onClick={() => navigate(it.path)}
                style={{
                  width: 48, height: 48, borderRadius: 8, display: "grid", placeItems: "center",
                  fontSize: 20, cursor: "pointer",
                  color: on ? color.honey : color.sidebarText,
                  background: on ? color.sidebarHover : "transparent",
                }}
              >
                {it.icon}
              </div>
            </Tooltip>
          );
        })}
        <div style={{ flex: 1 }} />
        {user?.role === "admin" && (
          <Tooltip title={t("nav.admin")} placement="right">
            <div
              onClick={() => navigate("/admin")}
              style={{
                width: 48, height: 48, borderRadius: 8, display: "grid", placeItems: "center",
                fontSize: 20, cursor: "pointer",
                color: current === "admin" ? color.honey : color.sidebarText,
                background: current === "admin" ? color.sidebarHover : "transparent",
              }}
            >
              <SettingOutlined />
            </div>
          </Tooltip>
        )}
        <Tooltip title={t("lang.toggle")} placement="right">
          <div onClick={() => setLocale(locale === "zh" ? "en" : "zh")} style={{ color: color.sidebarText, fontSize: 18, marginTop: 8, cursor: "pointer", fontWeight: 600 }}>
            <GlobalOutlined />
          </div>
        </Tooltip>
        <Tooltip title={dark ? t("theme.toLight") : t("theme.toDark")} placement="right">
          <div onClick={toggle} style={{ color: color.sidebarText, fontSize: 20, marginTop: 8, cursor: "pointer" }}>
            {dark ? <BulbFilled style={{ color: color.honey }} /> : <BulbOutlined />}
          </div>
        </Tooltip>
        <div style={{ marginBottom: 12, marginTop: 8 }}>
          <NotificationBell />
        </div>
        <Dropdown
          menu={{ items: [
            { key: "settings", label: t("menu.settings"), onClick: () => navigate("/settings") },
            { type: "divider" },
            { key: "out", label: t("menu.logout"), onClick: () => { logout(); navigate("/login"); } },
          ] }}
          placement="topRight"
        >
          <Avatar style={{ background: color.primary, cursor: "pointer" }}>
            {user?.name?.[0] ?? "U"}
          </Avatar>
        </Dropdown>
      </div>
      <div style={{ flex: 1, overflow: "auto", background: "var(--hive-bg-subtle)" }}>{children}</div>
      <ForcePasswordChange />
      <CommandPalette />
    </div>
  );
}
