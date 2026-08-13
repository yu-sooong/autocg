import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const AUTH_STATE = path.join(process.cwd(), "playwright", ".auth", "user.json");
const PROFILE = path.join(process.cwd(), "playwright", ".profile");

async function main() {
  fs.mkdirSync(path.dirname(AUTH_STATE), { recursive: true });
  fs.mkdirSync(PROFILE, { recursive: true });

  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1280, height: 860 },
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://www.threads.com/login", { waitUntil: "domcontentloaded" });

  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log("請在開啟的 Chromium 視窗自行登入 Threads。");
  console.log("程式不會讀取或顯示密碼。");
  console.log("登入完成後回到這裡按 Enter，以儲存 storage state。");
  await rl.question("");
  rl.close();

  await context.storageState({ path: AUTH_STATE });
  await context.close();
  console.log(`已儲存登入狀態：${AUTH_STATE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
