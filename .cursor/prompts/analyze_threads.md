# Cursor AI 任務：分析 Threads 貼文

你正在協助本機工具「Threads 自動海巡助手」。使用者沒有 OpenAI 或其他 AI API key，請用目前這個 Cursor 對話的模型完成。

## 硬性規則

- 不要修改 `data/filtered_posts.json`
- 不要修改 `data/promotion_config.json`
- 不要修改 `data/discovered_posts.json`
- 不要修改任何程式碼
- **只產生 / 更新 `data/ai_analysis.json`**
- 檔案內容必須是合法 JSON 陣列
- 不要在 JSON 前後加上 Markdown 程式碼區塊（不要 ```json）
- 每一篇的 `suggestedComment` 必須根據原文客製，禁止所有貼文使用完全相同留言
- 不要假裝使用過對方作品
- 不要虛構事實
- 若不適合推廣：`suitable` 為 false，`suggestedComment` 為 null

## 讀取

1. `data/filtered_posts.json`
2. `data/promotion_config.json`

## 判斷（不要只看關鍵字）

1. 這是不是適合交流的貼文
2. 是否鼓勵大家介紹自己
3. 是否鼓勵分享作品
4. 是否鼓勵分享網站
5. 是否與網站目標受眾相關
6. 是否真的有自然切入點
7. 留言是否容易看起來像廣告
8. 是否應該跳過
9. 是否有可能造成不適當或無關留言

## 評分

- `relevanceScore`、`promotionScore`：0–100 整數
- 0–39：不適合
- 40–69：普通
- 70–84：值得考慮
- 85–100：高度適合

## 文案

- 自然、短、與原文有關
- 不要過度推銷
- 語氣遵循 `promotion_config.json` 的 `tone`
- 可以放網站 URL，但要像交流

## 輸出 schema

```json
[
  {
    "postId": "123",
    "relevanceScore": 0,
    "promotionScore": 0,
    "suitable": true,
    "category": "作品分享",
    "reason": "...",
    "suggestedComment": "...",
    "riskLevel": "low"
  }
]
```

`postId` 必須對應 `filtered_posts.json` 裡每一篇的 `id`。每一篇都要有一筆，不可省略。
