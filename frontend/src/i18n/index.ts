import { create } from "zustand";

export type Locale = "zh" | "en";

const dict: Record<Locale, Record<string, string>> = {
  zh: {
    "nav.dashboard": "工作台", "nav.projects": "项目", "nav.messages": "消息", "nav.docs": "文档",
    "nav.files": "文件", "nav.approval": "审批", "nav.calendar": "日历", "nav.meetings": "视频会议", "nav.apps": "应用市场", "nav.admin": "管理后台",
    "menu.settings": "个人设置", "menu.logout": "退出登录",
    "theme.toLight": "切换浅色", "theme.toDark": "切换深色", "lang.toggle": "中文 / English",
    "login.welcome": "欢迎回来", "login.createTitle": "创建账号",
    "login.subtitleLogin": "登录你的 Hive 工作空间", "login.subtitleReg": "注册并开始你的第一个项目",
    "login.name": "姓名", "login.email": "邮箱", "login.password": "密码",
    "login.signin": "登录", "login.signup": "注册",
    "login.noAccount": "还没有账号？", "login.hasAccount": "已有账号？",
    "login.toRegister": "立即注册", "login.toLogin": "去登录",
    "login.slogan": "让团队协作\n像蜂巢一样高效",
    "login.tagline": "项目任务、即时沟通、文档协作与文件管理，一站式聚合。私有部署，数据自主可控。",
    "dash.hello": "你好", "dash.pick": "选择一个项目开始协作", "dash.newProject": "新建项目",
  },
  en: {
    "nav.dashboard": "Home", "nav.projects": "Projects", "nav.messages": "Messages", "nav.docs": "Docs",
    "nav.files": "Files", "nav.approval": "Approvals", "nav.calendar": "Calendar", "nav.meetings": "Meetings", "nav.apps": "App Store", "nav.admin": "Admin",
    "menu.settings": "Settings", "menu.logout": "Log out",
    "theme.toLight": "Light mode", "theme.toDark": "Dark mode", "lang.toggle": "中文 / English",
    "login.welcome": "Welcome back", "login.createTitle": "Create account",
    "login.subtitleLogin": "Sign in to your Hive workspace", "login.subtitleReg": "Sign up and start your first project",
    "login.name": "Name", "login.email": "Email", "login.password": "Password",
    "login.signin": "Sign in", "login.signup": "Sign up",
    "login.noAccount": "No account yet?", "login.hasAccount": "Already registered?",
    "login.toRegister": "Sign up", "login.toLogin": "Sign in",
    "login.slogan": "Make teamwork\nas efficient as a hive",
    "login.tagline": "Tasks, chat, docs and files in one place. Self-hosted, your data stays yours.",
    "dash.hello": "Hello", "dash.pick": "Pick a project to start", "dash.newProject": "New project",
  },
};

const KEY = "hive_locale";
const initial = (localStorage.getItem(KEY) as Locale) || "zh";

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}
const useLocale = create<LocaleState>((set) => ({
  locale: initial,
  setLocale: (l) => { localStorage.setItem(KEY, l); set({ locale: l }); },
}));

// useI18n 订阅 locale，组件会随语言切换重渲染。
export function useI18n() {
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const t = (k: string) => dict[locale][k] ?? dict.zh[k] ?? k;
  return { locale, setLocale, t };
}
