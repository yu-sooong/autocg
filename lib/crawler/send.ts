import fs from "node:fs";
import { AUTH_STATE } from "../paths";
import { logEvent } from "../logger";
import type { SendProvider, SendResult } from "./types";

export class MockSendProvider implements SendProvider {
  id = "mock" as const;
  async reply(): Promise<SendResult> {
    return {
      ok: true,
      mock: true,
      limitation: "MOCK MODE：沒有真正發送到 Threads，只更新本機狀態。",
    };
  }
}

export class PlaywrightSendProvider implements SendProvider {
  id = "playwright" as const;

  async reply(input: {
    postId: string;
    url: string;
    comment: string;
  }): Promise<SendResult> {
    if (!fs.existsSync(AUTH_STATE)) {
      return {
        ok: false,
        error: "尚未登入 Threads",
        limitation: "請先完成 Playwright 登入並儲存 storage state。",
      };
    }

    try {
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({
        headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
      });
      const context = await browser.newContext({ storageState: AUTH_STATE });
      const page = await context.newPage();
      await page.goto(input.url, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await page.waitForTimeout(2000);

      const box = page.getByRole("textbox").first();
      const visible = await box.isVisible().catch(() => false);
      if (!visible) {
        await browser.close();
        return {
          ok: false,
          error: "找不到回覆輸入框",
          limitation:
            "Threads 回覆 UI 可能需要登入、該貼文關閉回覆、或 DOM 已改版。不會繞過驗證。",
        };
      }
      await box.fill(input.comment);
      await page.waitForTimeout(400);

      const send = page
        .getByRole("button", { name: /post|reply|回覆|發布/i })
        .first();
      if (await send.isEnabled().catch(() => false)) {
        await send.click();
        await page.waitForTimeout(1500);
      } else {
        await box.press("Meta+Enter").catch(async () => {
          await box.press("Control+Enter");
        });
        await page.waitForTimeout(1500);
      }

      await context.storageState({ path: AUTH_STATE });
      await browser.close();
      logEvent("send", `Playwright 嘗試回覆 ${input.postId}`);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        limitation: "Playwright 發送失敗。不會繞過 CAPTCHA、rate limit 或登入保護。",
      };
    }
  }
}
