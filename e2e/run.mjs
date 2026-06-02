import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:8000";
const OUT = "D:/codes/web/Hive/exports/e2e";
mkdirSync(OUT, { recursive: true });

const consoleErrors = [];
const pageErrors = [];

const ts = Date.now();
const email = `e2e_${ts}@hive.local`;
const pass = "e2e12345";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => pageErrors.push(String(e)));

const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }); console.log("📸", name); };
const step = async (label, fn) => { try { await fn(); console.log("✅", label); } catch (e) { console.log("❌", label, "::", e.message); throw e; } };

try {
  await step("打开登录页", async () => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await shot("01-login");
  });

  await step("切换到注册并提交", async () => {
    await page.getByText("立即注册").click();
    await page.getByPlaceholder("姓名").fill("E2E 测试");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(pass);
    await page.getByRole("button", { name: /注\s*册/ }).click();
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 10000 });
    await page.waitForTimeout(800);
    await shot("02-dashboard");
  });

  await step("新建项目", async () => {
    await page.getByRole("button", { name: "新建项目" }).first().click();
    await page.getByPlaceholder("例如：产品设计冲刺").fill("E2E 看板项目");
    await page.getByRole("button", { name: /创\s*建/ }).click();
    await page.waitForURL(/\/projects\//, { timeout: 10000 });
    await page.waitForTimeout(800);
    await shot("03-board-empty");
  });

  await step("在待办列添加任务", async () => {
    const add = page.getByPlaceholder("+ 添加任务").first();
    await add.click();
    await add.fill("设计登录页高保真稿");
    await add.press("Enter");
    await page.waitForTimeout(600);
    await add.fill("看板拖拽交互定义");
    await add.press("Enter");
    await page.waitForTimeout(800);
    await shot("04-board-tasks");
  });

  await step("切换列表视图", async () => {
    await page.getByText("列表", { exact: true }).click();
    await page.waitForTimeout(600);
    await shot("04b-list");
    await page.getByText("看板", { exact: true }).click();
    await page.waitForTimeout(400);
  });

  await step("切换仪表盘视图", async () => {
    await page.getByText("仪表盘", { exact: true }).click();
    await page.waitForTimeout(600);
    await shot("04c-dash");
    await page.getByText("看板", { exact: true }).click();
    await page.waitForTimeout(400);
  });

  await step("切换甘特图视图", async () => {
    await page.getByText("甘特", { exact: true }).click();
    await page.waitForTimeout(600);
    await shot("04d-gantt");
    await page.getByText("看板", { exact: true }).click();
    await page.waitForTimeout(400);
  });

  await step("打开任务详情抽屉", async () => {
    await page.getByText("设计登录页高保真稿").click();
    await page.waitForTimeout(800);
    await shot("05-task-detail");
  });

  await step("AI 拆解子任务并采纳", async () => {
    await page.getByRole("button", { name: /AI\s*拆解/ }).click();
    await page.getByText("AI 建议", { exact: false }).waitFor({ timeout: 8000 });
    await shot("05b-ai");
    await page.getByRole("button", { name: "采纳全部" }).click();
    await page.waitForTimeout(900);
    await shot("05c-ai-adopted");
    await page.locator(".ant-drawer-close").click();
    await page.locator(".ant-drawer-mask").waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(600);
    await shot("04e-rich-card");
  });

  await step("邀请成员弹窗", async () => {
    await page.getByRole("button", { name: "邀请成员" }).click();
    await page.waitForTimeout(500);
    await shot("06-invite");
    await page.keyboard.press("Escape");
  });

  for (const [path, name] of [["/messages", "07-messages"], ["/docs", "08-docs"], ["/files", "09-files"]]) {
    await step(`访问 ${path}`, async () => {
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      await shot(name);
    });
  }

  await step("文档白板（思维导图/流程图）", async () => {
    await page.goto(BASE + "/docs", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /新\s*建/ }).click();
    await page.getByText("新建白板（导图/流程图）").click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /添加节点/ }).click();
    await page.getByRole("button", { name: /添加节点/ }).click();
    await page.waitForTimeout(400);
    await shot("19-whiteboard");
  });

  await step("富文本文档", async () => {
    await page.getByRole("button", { name: /新\s*建/ }).click();
    await page.getByText("新建文档", { exact: true }).click();
    await page.waitForTimeout(700);
    const ed = page.locator('[contenteditable="true"]');
    await ed.click();
    await ed.type("Hive 富文本编辑测试");
    await shot("20-richdoc");
  });

  await step("IM 发送并实时收到消息（验证 WS 闭环）", async () => {
    await page.goto(BASE + "/messages", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const msg = "Playwright 实时消息 " + ts;
    const box = page.getByPlaceholder("输入消息，Enter 发送…");
    await box.fill(msg);
    await box.press("Enter");
    await page.getByText(msg).waitFor({ timeout: 8000 });
    await shot("11-im-realtime");
    await page.getByText("撤回", { exact: true }).last().click();
    await page.getByText("[消息已撤回]").waitFor({ timeout: 6000 });
    await shot("11b-recalled");
  });

  await step("审批页", async () => {
    await page.goto(BASE + "/approvals", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await shot("13-approvals");
    await page.getByRole("button", { name: /发起审批/ }).click();
    await page.waitForTimeout(400);
    await shot("13b-approval-modal");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  await step("视频会议页", async () => {
    await page.goto(BASE + "/meetings", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await shot("18-meetings");
  });

  await step("应用市场安装", async () => {
    await page.goto(BASE + "/apps", { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    await shot("17-appstore");
    await page.getByRole("button", { name: /^安\s*装$/ }).first().click();
    await page.getByText("已安装", { exact: false }).first().waitFor({ timeout: 6000 });
    await shot("17b-installed");
  });

  await step("日历打卡", async () => {
    await page.goto(BASE + "/calendar", { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    await shot("14-calendar");
    await page.getByRole("button", { name: /立即打卡/ }).click();
    await page.getByText("今日已打卡").waitFor({ timeout: 6000 });
    await shot("14b-checked");
  });

  await step("个人设置页", async () => {
    await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await shot("12-settings");
  });

  await step("全局搜索 ⌘K", async () => {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(400);
    await page.getByPlaceholder(/搜索任务/).fill("设计");
    await page.getByText("设计登录页高保真稿").first().waitFor({ timeout: 6000 });
    await shot("16-search");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  await step("切换英文界面（i18n）", async () => {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.locator(".anticon-global").click();
    await page.getByText("New project").waitFor({ timeout: 5000 });
    await shot("15-english");
    await page.locator(".anticon-global").click();
    await page.waitForTimeout(300);
  });

  await step("切换深色模式", async () => {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.locator(".anticon-bulb").click();
    await page.waitForTimeout(600);
    await shot("10-dark");
  });
} catch (e) {
  await shot("error-state");
} finally {
  console.log("\n==== Console errors:", consoleErrors.length, "====");
  consoleErrors.slice(0, 20).forEach((e) => console.log("  •", e));
  console.log("==== Page errors:", pageErrors.length, "====");
  pageErrors.slice(0, 20).forEach((e) => console.log("  •", e));
  await browser.close();
  if (pageErrors.length) process.exit(2);
}
