# Threads 自動海巡助手 — 架構結論（2026-08）

本文件記錄實作前的研究結果與最終架構。來源以 Meta 官方文件、官方 sample repo，以及 Cursor 官方文件為準。

---

## A. Threads 官方 API 能力（2026）

官方入口：

- [Threads API](https://developers.facebook.com/docs/threads)
- [Overview](https://developers.facebook.com/docs/threads/overview/)
- [Get Started](https://developers.facebook.com/docs/threads/get-started/)
- [Keyword Search](https://developers.facebook.com/documentation/threads/keyword-search)
- [Reply Management](https://developers.facebook.com/documentation/threads/retrieve-and-manage-replies)
- 官方 sample：[fbsamples/threads_api](https://github.com/fbsamples/threads_api)

Host：`graph.threads.com` 或 `graph.threads.net`，目前常用版本 `v1.0`。

### 能力對照

| 需求 | API 能不能做 | 說明 |
| --- | --- | --- |
| 1. 搜尋公開貼文 | **有條件可以** | `GET /keyword_search`。未通過 App Review 的 `threads_keyword_search` 時，**只會搜到登入者自己的貼文**。 |
| 2. 依關鍵字搜尋 | **可以** | `q` + `search_mode=KEYWORD`（預設）或 `TAG`。`search_type=TOP\|RECENT`。`limit` 預設 25、最大 100。 |
| 3. 取得公開貼文內容 | **可以** | fields 含 `text`、`media_type`。 |
| 4. 取得作者 | **可以** | field：`username`。 |
| 5. 取得貼文 URL | **可以** | field：`permalink`。 |
| 6. reply / comment | **可以** | 建立 container 時帶 `reply_to_id`，再 `threads_publish`。官方 Keyword Search 文件說明：對搜尋到的公開媒體可 reply / quote / repost。 |
| 7. OAuth 權限 | 見下表 | 使用者必須在 Authorization Window 授權；非 tester 需 App Review。OAuth redirect **不支援 localhost**。 |
| 8. Rate limit | 見下表 | 以使用者為單位、滾動視窗。 |
| 9. API 做不到的事 | 見下節 | 不要假設 API 能「海巡整個公開動態牆」。 |
| 10. Playwright 是否需要 | **MVP 需要當 fallback** | 沒有 Meta App / 未過 Review 時，官方 API 無法做公開海巡。 |

### OAuth / Permissions（官方）

| Permission | 用途 |
| --- | --- |
| `threads_basic` | 所有端點都需要 |
| `threads_content_publish` | 發文 |
| `threads_manage_replies` | 發 reply |
| `threads_read_replies` | 讀 reply |
| `threads_manage_insights` | insights |
| `threads_keyword_search` | 公開關鍵字搜尋（未核准 = 只搜自己） |
| `threads_manage_mentions` | mentions |
| `threads_delete` | 刪文 |
| `threads_location_tagging` | 地點搜尋 / 標註 |
| `threads_share_to_instagram` | 分享到 IG（2026-03 新增） |

Token：OAuth 2.0、app-scoped、短效可換長效。請求必須帶 Threads user access token。

### Rate limits（官方數字優先）

| 動作 | 上限 | 視窗 | 來源 |
| --- | --- | --- | --- |
| 發文 | 250 | 滾動 24h | Overview |
| 回覆 | 1,000 | 滾動 24h | Overview / Reply Management |
| 刪文 | 100 | 滾動 24h | Overview |
| 地點搜尋 | 500 | 滾動 24h | Overview |
| **關鍵字搜尋** | **2,200 queries / 使用者** | **滾動 24h** | [Keyword Search 官方文件](https://developers.facebook.com/documentation/threads/keyword-search) |

關鍵字搜尋額外規則（官方）：

- 上限是「同一個 Threads 使用者、跨所有 App」合計，不是每個 App 各算一次。
- 同一關鍵字在視窗內的後續查詢也計入。
- **沒有結果的查詢不計入**。
- 被判定敏感 / 冒犯的關鍵字會回空陣列。
- 可用 `GET /{user-id}/threads_publishing_limit` 查發文 / 回覆額度。

> 第三方文章有寫「關鍵字搜尋 500 / 7 天」。那與官方 Keyword Search 頁的 **2,200 / 24h** 不一致。本專案以官方文件為準，並在 UI 標註查核日期。

### API 明確做不到 / 不適合當第一版主路徑的事

1. **沒有「瀏覽公開動態牆 / 探索頁」端點。** 發現公開貼文的官方路徑是 Keyword / Topic Tag Search，不是任意爬 feed。
2. **公開搜尋需要 App Review。** 本機個人工具很難在第一週就拿到 `threads_keyword_search` advanced access。
3. **OAuth 不能用 `localhost` redirect。** 官方 sample 要求改 `/etc/hosts` 對應自訂 domain。
4. **沒有語意搜尋。** 不能直接問「找出鼓勵自我介紹的貼文」；只能先用關鍵字撈，再由程式 / AI 過濾。
5. **Reply Management 文件的主場景是管理「自己貼文下的回覆」。** 對他人公開貼文回覆，走的是 publishing + `reply_to_id`，且受 1,000 / 24h 限制。
6. **Overview 仍寫：API 主要讓 App 代使用者發文，並把「該使用者自己的貼文」顯示給該使用者。** 把大量他人貼文做成公開產品可能踩 ToS；本專案定位為**本機個人工具**。
7. **沒有官方「批次海巡」產品 API。** 高頻搜尋 + 高頻留言本身就會撞 rate limit 與平台政策。

### 本專案明確不做

- reverse-engineered / 非官方 Threads private API
- CAPTCHA bypass、stealth plugin、fingerprint spoofing
- 偷 cookie、破解 session、繞過 rate limit
- 把同一個罐頭留言灌進所有貼文

---

## B. Cursor 能否從外部啟動 Chat / Agent

官方與可靠路徑（2026）：

| 方法 | 能不能用 | 行為 | 適不適合作第一版 |
| --- | --- | --- | --- |
| **Prompt deeplink** `cursor://anysphere.cursor-deeplink/prompt?text=...` | **可以** | 開啟 Cursor，把 prompt **預填**進 Chat。使用者必須自己確認後才執行。Deeplink **不會自動執行**。上限約 8,000 字元。 | **第一版主路徑** |
| **Command / Rule deeplink** | 可以，但用途不同 | 建立 command / rule，不是啟動一次分析任務 | 可順便放 `.cursor/commands` |
| **`cursor <folder>` / `open -a Cursor`** | **可以** | 開啟專案資料夾 | 搭配 deeplink |
| **Cursor CLI `agent -p "..."`** | **可以（若已安裝 CLI）** | headless、可寫檔、適合腳本。非互動模式有完整寫入權限。 | **可選加強**，不當作必要條件 |
| **`@cursor/sdk` `Agent.prompt` / `Agent.create`** | 可以 | 需要 `CURSOR_API_KEY`（Cursor Dashboard → Integrations） | **不做第一版必要條件**（使用者明確說不要先買 / 設 AI API） |
| **MCP** | 可當工具，不能當啟動器 | 沒有「從 Dashboard 叫 Cursor 開新 Chat」的 MCP 標準 | 不依賴 |
| **專用 Agent deeplink** `cursor://.../agent?prompt=` | **沒有** | 官方論壇（2026-01）確認目前只有 `/prompt` `/command` `/rule` | 無法使用 |
| **Workspace Task 自動開 Chat** | 不可靠 | 沒有穩定的「外部程式建立新 Agent conversation」官方 API | 不依賴 |

結論：

- **第一版 AI = CursorProvider = JSON 工作流，不呼叫 OpenAI / Grok API。**
- Dashboard 按「交給 Cursor AI 分析」時：
  1. 確認 `filtered_posts.json`、`promotion_config.json`
  2. 寫 `.cursor/prompts/analyze_threads.md` 與 `data/cursor_instruction.md`
  3. 複製短 prompt
  4. 嘗試 `open` prompt deeplink + 開啟專案資料夾
  5. 若偵測到 `agent` CLI，提供「用 Cursor CLI 自動分析」選項（可失敗、不擋流程）
  6. Dashboard 每 2 秒輪詢 `ai_analysis.json` 的 mtime / hash
- **不能完全自動按下 Chat 的 Send。** 這不是缺陷，是官方設計（deeplink never auto-executes）。Fallback UI 必須一等公民。

---

## C. Playwright 最適合負責的部分

只做**使用者自己也會做的瀏覽器操作**，使用獨立 profile / `storageState`，不用系統 Chrome 主 profile。

| 工作 | 給誰 | 原因 |
| --- | --- | --- |
| 關鍵字搜尋公開貼文（無 Meta App 時） | Playwright fallback | API 公開搜尋過不了 Review |
| 第一次登入 Threads | Playwright headed | 使用者自己登入，程式只存 storage state，不碰密碼 |
| 在網頁上回覆（無 API token 時） | Playwright fallback | 官方 API 發 reply 需要 App + `threads_manage_replies` |
| 發 reply（已有 token） | **官方 API 優先** | 比 UI 穩定、有官方 quota |
| 關鍵字搜尋（已有核准權限） | **官方 API 優先** | 有文件、有 fields、有 quota |
| CAPTCHA / 風控 | **不做、不繞過** | 停下來，UI 顯示「需要人工處理」 |

Playwright 限制（必須在 UI 顯示）：

- Threads DOM 不穩定，選擇器可能隨時壞掉。
- Search URL / 登入牆 / 地區限制會讓爬取失敗。
- 這不是「偷偷打 private API」，失敗時應降級，而不是硬幹。

---

## D. 值得參考的開源專案

| 專案 | 用途 | 本專案怎麼用 |
| --- | --- | --- |
| [fbsamples/threads_api](https://github.com/fbsamples/threads_api) | Meta 官方 sample：OAuth、發文、keyword search、mentions | **唯一官方參考實作**。OAuth、search、reply 對齊它的呼叫方式。 |
| 非官方 reverse-engineered Threads client | 打 web 內部 API | **不採用** |

不引入任何破解、stealth、或非官方 Graph 包裝庫來「補官方不足」。

---

## E. 評估：API / Playwright / Hybrid

| 方案 | 優點 | 缺點 | 適配 |
| --- | --- | --- | --- |
| 純 API | 穩定、官方、有 quota 文件 | 公開搜尋要 App Review；OAuth 不能 localhost；第一週幾乎跑不起來 | 當 **Phase 2 provider** |
| 純 Playwright | 不需 Meta App 就能開始 | DOM 脆、登入牆、平台可能擋自動化 | 當 **fallback provider** |
| **Hybrid + Mock-first** | Dashboard / AI JSON / Queue 不依賴外部 | 實作較多介面 | **第一版採用** |

### 最終選擇：**Hybrid，Mock 為預設**

```
DiscoveryProvider
  ├── MockDiscoveryProvider      ← 預設 MOCK_MODE=true
  ├── ThreadsApiDiscoveryProvider ← 有 THREADS_ACCESS_TOKEN 且啟用 API
  └── PlaywrightDiscoveryProvider ← 有 storage state 且使用者選擇

SendProvider
  ├── MockSendProvider           ← 預設，只改狀態、不真的發
  ├── ThreadsApiSendProvider     ← reply_to_id + threads_publish
  └── PlaywrightSendProvider     ← 開啟貼文 URL，在回覆框輸入並送出

AIProvider
  └── CursorProvider             ← JSON + deeplink / CLI fallback
      （預留 OpenAIProvider / GeminiProvider / GrokProvider / LocalLLMProvider）
```

沒有 Threads API、沒有 Playwright session 時，**整個產品仍可完整走完**：

海巡（mock）→ 關鍵字過濾 → Cursor 分析 → 編輯文案 → 批次確認 → Queue → 成功 / 失敗。

---

## F. 最終架構

### 產品定位

本機、單人、macOS 工具。不是 SaaS。

目標體驗：

1. 開始海巡 → 2. 交給 Cursor AI → 3. 改文案並勾選 → 4. 一次送出 → Queue 進度。

### 資料契約（Cursor 只碰分析檔）

```
data/
  discovered_posts.json    ← crawler 寫
  filtered_posts.json      ← filter 寫；AI 禁止改
  promotion_config.json    ← Dashboard 寫；AI 禁止改
  ai_analysis.json         ← Cursor AI 只准寫這個
  mock_posts.json          ← Mock 來源
  keywords.json            ← 關鍵字開關
  app_state.json           ← 貼文狀態 / queue / 發送紀錄（SQLite 同步來源也可）
```

Prisma + SQLite 存：貼文狀態機、queue、作者冷卻、每日額度、嘗試次數。JSON 是給 Cursor 的穩定契約；Dashboard 以 DB 為操作來源，並在 AI 完成時把 `ai_analysis.json` merge 回去。

### 狀態機

`draft → needs_review → approved → queued → sending → sent | failed`

另外：`skipped`

同一 `id` 或 canonical URL 不可重複進入待處理。同一作者預設 30 天冷卻。

### Queue

- `concurrency = 1`
- delay、pause / resume / stop / retry
- `maximumDailyActions`（預設遠低於官方 1,000 replies，例如 20）
- 每篇：`approvedAt` `queuedAt` `sentAt` `error` `attemptCount`

### Cursor 分析契約

Instruction 必須包含：

- 不要修改 `filtered_posts.json`
- 不要修改 `promotion_config.json`
- 只產生 / 更新 `ai_analysis.json`
- 輸出必須是合法 JSON 陣列
- 不要在 JSON 外輸出 Markdown
- 每篇文案必須不同；不適合則 `suggestedComment: null`

Dashboard：每 2 秒 GET `/api/ai/status`，比對檔案 hash。

### 技術棧

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Prisma + SQLite
- Zod schema
- Playwright + Chromium（獨立 `playwright/.auth/user.json`）
- Vitest
- 檔案 log：`logs/{crawler,filter,ai,queue,send,error}.log`

### 目錄

```
app/                 Next.js routes + API
components/          Dashboard UI
lib/
  threads/           官方 API client + providers
  crawler/           discovery 介面（mock / api / playwright）
  ai/                AIProvider + CursorProvider + schema
  queue/             單執行緒 queue
  storage/           JSON + Prisma helpers
  filter/            關鍵字與去重
prisma/
data/
scripts/
playwright/
.cursor/prompts/
.cursor/commands/
```

### 安全注意

- 不讀、不顯示 Threads 密碼。
- storage state 與 access token 只存在本機，且列入 `.gitignore`。
- 預設 Mock，避免使用者一安裝就對真實帳號大量操作。
- 真發送前一定有確認 Dialog。
- 遵守官方 rate limit；本機再加更嚴的 daily cap。

---

## 實作順序（已執行）

1. Mock Mode 打通 Dashboard ↔ JSON ↔ Cursor ↔ Queue
2. Playwright 登入 + 搜尋 fallback（失敗時 UI 顯示限制）
3. 官方 API provider（有 token 才啟用，不阻擋 MVP）
