# autocg

本機 [Threads](https://www.threads.com/) 海巡助手。找出適合交流的公開貼文，用關鍵字過濾，交給 Cursor 分析文案，你確認後再批次送出。

這是開源的本機工具，不是雲端服務，也不是垃圾留言機器人。預設 `MOCK_MODE=true`，安裝後不會對真實 Threads 發任何東西。

[授權](#授權) · [安裝](#安裝) · [使用](#使用) · [貢獻](#貢獻)

---

## 這是什麼

流程很短：

1. **海巡** — 用關鍵字找出公開貼文  
2. **過濾** — 程式先比對關鍵字  
3. **分析** — 交給 Cursor / Grok 判斷適不適合、寫建議留言  
4. **確認** — 你在畫面勾選、改文案  
5. **送出** — 一次一篇，有每日上限與作者冷卻

適合想在 Threads 上自然認識創作者、分享作品或網站的人。不適合拿來洗版、複製貼上同一則廣告。

## 不是什麼

- 不會幫你繞過 CAPTCHA、rate limit、登入保護或平台安全機制  
- 不會讀取 Threads 密碼  
- 不會在沒有你確認的情況下發留言  
- 官方 API **沒有**「瀏覽整個公開動態牆」這種端點；海巡只能靠關鍵字 / 主題標籤  

請遵守 [Threads 社群守則](https://help.instagram.com/769983657143541) 與 [Threads API 政策](https://developers.facebook.com/docs/threads)。高頻、重複、像廣告的留言仍可能被檢舉或限制。

## 需求

- macOS（第一版以本機 macOS 為主）  
- Node.js 20+  
- [pnpm](https://pnpm.io/) 9+  
- 可選：[Playwright Chromium](https://playwright.dev/)、[Cursor](https://cursor.com/)

## 安裝

```bash
git clone https://github.com/yu-sooong/autocg.git
cd autocg
pnpm install
pnpm exec playwright install chromium
pnpm db:push
cp .env.example .env
```

`.env` 預設：

```
MOCK_MODE=true
DISCOVERY_PROVIDER=mock
SEND_PROVIDER=mock
```

啟動：

```bash
pnpm dev
```

瀏覽器開啟 [http://localhost:3000](http://localhost:3000)。

## 使用

### Mock（建議先這樣）

沒有 Meta App、也沒有 Playwright session 時，一定走 Mock。

- 資料來源：`data/mock_posts.json`
- 海巡、過濾、Cursor 分析、勾選、佇列都可以完整跑
- 佇列「成功」= 本機狀態更新，**不是真的留言**

### 搜尋與推廣

Dashboard 可新增 / 停用關鍵字。預設包含「互相認識」「分享你的作品」等交流向詞彙。

「推廣設定」寫入 `data/promotion_config.json`（網站名稱、URL、介紹、受眾、語氣）。Cursor 分析時會讀它，**請不要讓 AI 改這份檔**。

### Cursor 分析

第一版不需要 OpenAI / Gemini / Grok API key。AI 走 Cursor Chat / Agent。

1. 確認已有過濾後的貼文與推廣設定  
2. 按「交給 Cursor」  
3. Prompt 會複製到剪貼簿；也可使用 Cursor deeplink（[不會自動送出](https://cursor.com/docs/reference/deeplinks)）  
4. 在 Cursor 輸入 `/analyze-threads` 也可以  
5. 畫面會偵測 `data/ai_analysis.json`，寫入後自動合併到列表  

硬性規則：

- 不要修改 `filtered_posts.json` / `promotion_config.json`
- 只寫 `ai_analysis.json`
- 必須是合法 JSON 陣列，不要包 Markdown

### 登入 Threads（可選）

程式不讀密碼。會開獨立 Chromium，你自己登：

```bash
pnpm threads:login
```

獨立 profile 在 `playwright/.profile/`，session 在 `playwright/.auth/user.json`。**不會使用你的 Chrome 主 profile。**

### 真的要發留言時

確定你了解限制後：

```
MOCK_MODE=false
DISCOVERY_PROVIDER=auto
SEND_PROVIDER=auto
```

`auto`：有 `THREADS_ACCESS_TOKEN` 用官方 API；有 Playwright session 用瀏覽器；否則回 Mock。

送出前一定有確認對話框。佇列 `concurrency = 1`，同一作者預設 30 天冷卻，每日上限預設 20。

## 設定

見 [`.env.example`](./.env.example)。

| 變數 | 預設 | 說明 |
| --- | --- | --- |
| `MOCK_MODE` | `true` | `false` 才可能打真實 Threads |
| `DISCOVERY_PROVIDER` | `mock` | `mock` / `api` / `playwright` / `auto` |
| `SEND_PROVIDER` | `mock` | 同上 |
| `QUEUE_DELAY_MS` | `8000` | 兩則留言間隔 |
| `MAX_DAILY_ACTIONS` | `20` | 每日發送上限 |
| `AUTHOR_COOLDOWN_DAYS` | `30` | 同一作者冷卻天數 |

官方 API 可選：把 token 填進 `THREADS_ACCESS_TOKEN` / `THREADS_USER_ID`。OAuth **不支援 localhost**。細節見 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 資料檔

會進 git 的只有範例：

```
data/mock_posts.json         Mock 來源
data/promotion_config.json   推廣設定範例
```

執行後本機才會出現、且已列入 `.gitignore`：

```
data/discovered_posts.json   crawler 寫
data/filtered_posts.json     過濾結果（AI 禁止改）
data/ai_analysis.json        Cursor 只准寫這個
```

`.env`、SQLite、Playwright session 也不會進版控。

## 測試

```bash
pnpm test
```

涵蓋關鍵字過濾、去重、AI JSON schema、分數區間、queue / retry、Mock crawler。

## 技術

Next.js 15 · React 19 · Prisma + SQLite · Playwright · Zod · Vitest

架構與 Threads API 限制（2026-08 官方文件對照）見 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 貢獻

歡迎 Issue 與 Pull Request。

1. Fork 這個 repo  
2. 開分支做一件清楚的事  
3. `pnpm test` 要過  
4. PR 請說明動機與驗證方式  

請不要送「繞過平台限制」「自動洗版」「隱藏真實發送」這類變更。這類 PR 會直接關閉。

回報問題時，盡量附：

- 你用的是 Mock、API 還是 Playwright  
- 相關 log（`logs/`，請先拿掉 token）  
- 期望行為 vs 實際行為  

## 安全

- 不要把 `.env`、`playwright/.auth/`、資料庫 commit 上去  
- Token 若已外洩，到 Meta 後台撤銷  
- 發現漏洞請開 Issue，或私下聯絡維護者，不要公開 PoC  

## 授權

[MIT](./LICENSE)

使用本工具造成的帳號限制、內容爭議或違反平台政策，由使用者自行負責。
