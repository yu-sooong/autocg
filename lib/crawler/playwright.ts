import fs from "node:fs";
import { AUTH_STATE } from "../paths";
import { logEvent } from "../logger";
import type { DiscoveredPost } from "../schema";
import type { DiscoveryProvider, DiscoveryResult } from "./types";

export class PlaywrightDiscoveryProvider implements DiscoveryProvider {
  id = "playwright" as const;

  async search(keywords: string[]): Promise<DiscoveryResult> {
    if (!fs.existsSync(AUTH_STATE)) {
      return {
        provider: "playwright",
        posts: [],
        error: "尚未登入 Threads",
        limitation:
          "請先按「開啟 Threads 登入」，在獨立 Chromium 視窗自行登入。程式不會讀取密碼。登入完成後才可海巡。",
      };
    }

    try {
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({
        headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
      });
      const context = await browser.newContext({ storageState: AUTH_STATE });
      const page = await context.newPage();
      const posts: DiscoveredPost[] = [];
      const seen = new Set<string>();

      for (const keyword of keywords.slice(0, 8)) {
        await page.goto(
          `https://www.threads.com/search?q=${encodeURIComponent(keyword)}&serp_type=default`,
          { waitUntil: "domcontentloaded", timeout: 45000 },
        );
        await page.waitForTimeout(2500);

        const found = await page.evaluate(() => {
          const results: Array<{
            id: string;
            url: string;
            author: string;
            text: string;
          }> = [];
          const anchors = Array.from(
            document.querySelectorAll('a[href*="/post/"]'),
          ) as HTMLAnchorElement[];
          for (const a of anchors) {
            const href = a.href.split("?")[0];
            const match = href.match(/\/(@[^/]+)\/post\/([^/?#]+)/);
            if (!match) continue;
            const article =
              a.closest("div[data-pressable-container='true']") ??
              a.closest("article") ??
              a.parentElement;
            const text = (article?.textContent ?? "").replace(/\s+/g, " ").trim();
            results.push({
              id: match[2],
              url: href,
              author: match[1],
              text: text.slice(0, 2000),
            });
          }
          return results;
        });

        for (const item of found) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          posts.push({
            ...item,
            createdAt: undefined,
            matchedKeywords: [],
          });
        }

        await page.waitForTimeout(1500);
      }

      await browser.close();
      logEvent("crawler", `Playwright 發現 ${posts.length} 篇`);
      return {
        provider: "playwright",
        posts,
        limitation:
          posts.length === 0
            ? "Playwright 沒有解析到貼文。Threads 搜尋頁 DOM 可能已變更、需要登入、或被平台要求驗證。本工具不會繞過 CAPTCHA 或風控。"
            : "Playwright 僅模擬一般瀏覽器搜尋。選擇器可能因 Threads 改版而失效。",
      };
    } catch (err) {
      logEvent("error", "Playwright 搜尋失敗", {
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        provider: "playwright",
        posts: [],
        error: err instanceof Error ? err.message : String(err),
        limitation:
          "Playwright 海巡失敗。不會嘗試破解登入保護、CAPTCHA 或 rate limit。請改用 Mock Mode，或稍後再試。",
      };
    }
  }
}
