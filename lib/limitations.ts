export const THREADS_LIMITATIONS = [
  "官方 Keyword Search 未通過 App Review 時，只會搜到自己的貼文。",
  "官方沒有「瀏覽公開動態牆」端點；海巡只能靠關鍵字 / 主題標籤。",
  "OAuth redirect 不支援 localhost。",
  "Cursor deeplink 只會預填 Chat，不會自動送出。",
  "Playwright 不會繞過 CAPTCHA、rate limit 或登入保護。",
] as const;
