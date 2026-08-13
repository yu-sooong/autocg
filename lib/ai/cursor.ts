import { execFile } from "node:child_process";
import fs from "node:fs";
import { promisify } from "node:util";
import { FILES, ROOT } from "../paths";
import { logEvent } from "../logger";
import { writeText } from "../storage/json";
import type { FilteredPost, PromotionConfig } from "../schema";
import type { AIProvider, PrepareAnalysisResult } from "./provider";

const execFileAsync = promisify(execFile);

export const SHORT_PROMPT = `請依照 .cursor/prompts/analyze_threads.md 完成 Threads 海巡分析。

硬性規則：
- 不要修改 data/filtered_posts.json
- 不要修改 data/promotion_config.json
- 只產生或更新 data/ai_analysis.json
- 輸出必須是合法 JSON 陣列
- 不要在 JSON 檔外再包 Markdown 程式碼區塊
- 讀取 data/filtered_posts.json 與 data/promotion_config.json
- 每一篇的 suggestedComment 必須不同；不適合推廣則為 null`;

function buildInstruction(posts: FilteredPost[], config: PromotionConfig) {
  return `# Cursor AI 任務：分析 Threads 貼文並只寫入 ai_analysis.json

你是這個本機專案的分析代理。使用者沒有 OpenAI / 其他 AI API key。請用你現在這個 Cursor 對話裡的模型完成任務。

## 禁止

- 不要修改 \`data/filtered_posts.json\`
- 不要修改 \`data/promotion_config.json\`
- 不要修改 \`data/discovered_posts.json\`
- 不要修改程式碼
- 不要在 \`data/ai_analysis.json\` 之外輸出 Markdown 包裹的 JSON
- 不要對所有貼文使用完全相同的留言
- 不要假裝用過對方作品
- 不要虛構事實

## 必做

1. 讀取 \`data/filtered_posts.json\`（共 ${posts.length} 篇）
2. 讀取 \`data/promotion_config.json\`
3. 只寫入 / 覆寫 \`data/ai_analysis.json\`
4. 檔案內容必須是**合法 JSON 陣列**，不要前後加 \`\`\`json

## 網站

- 名稱：${config.websiteName}
- URL：${config.websiteUrl}
- 介紹：${config.description}
- 目標受眾：${config.targetAudience.join("、")}
- 推廣主題：${config.promotionTopics.join("、")}
- 語氣：${config.tone}

## 判斷（不要只看關鍵字）

對每一篇判斷：

1. 是不是適合交流的貼文
2. 是否鼓勵介紹自己
3. 是否鼓勵分享作品
4. 是否鼓勵分享網站
5. 是否與目標受眾相關
6. 是否真的有自然切入點
7. 留言是否容易看起來像廣告
8. 是否應該跳過
9. 是否可能造成不適當或無關留言

## 評分

- relevanceScore、promotionScore：0–100 整數
- 0–39 不適合
- 40–69 普通
- 70–84 值得考慮
- 85–100 高度適合
- 不適合時 \`suitable\` 為 false，\`suggestedComment\` 為 null
- riskLevel：low | medium | high

## 文案

- 自然、短、與原文有關
- 不要過度推銷
- 可以放網站 URL，但要像交流不是廣告
- 每篇必須根據原文客製

## 輸出 schema

\`\`\`json
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
\`\`\`

每一個 filtered post 都要有一筆，\`postId\` 對應貼文 \`id\`。
`;
}

function promptDeeplink(text: string) {
  const url = new URL("cursor://anysphere.cursor-deeplink/prompt");
  url.searchParams.set("text", text);
  return url.toString();
}

async function tryOpen(target: string) {
  try {
    await execFileAsync("open", [target], { cwd: ROOT });
    return true;
  } catch {
    return false;
  }
}

async function cliAvailable() {
  try {
    await execFileAsync("which", ["agent"]);
    return true;
  } catch {
    return false;
  }
}

export class CursorProvider implements AIProvider {
  id = "cursor";

  async prepare(input: {
    posts: FilteredPost[];
    config: PromotionConfig;
  }): Promise<PrepareAnalysisResult> {
    if (!fs.existsSync(FILES.filtered)) {
      throw new Error("filtered_posts.json 不存在，請先海巡");
    }
    if (!fs.existsSync(FILES.promotion)) {
      throw new Error("promotion_config.json 不存在");
    }

    const instruction = buildInstruction(input.posts, input.config);
    writeText(FILES.instruction, instruction);
    writeText(FILES.promptCopy, SHORT_PROMPT);

    const deeplink = promptDeeplink(SHORT_PROMPT);
    const openedDeeplink = await tryOpen(deeplink);
    const openedCursor = await tryOpenCursorApp();

    const cli = await cliAvailable();
    logEvent("ai", "已準備 Cursor 分析", {
      posts: input.posts.length,
      openedDeeplink,
      cli,
    });

    return {
      ok: true,
      prompt: SHORT_PROMPT,
      deeplink,
      instructionPath: FILES.instruction,
      openedCursor: openedDeeplink || openedCursor,
      openedDeeplink,
      cliAvailable: cli,
      message: openedDeeplink
        ? "已嘗試用 Cursor deeplink 預填 Chat。請在 Cursor 裡確認後送出。Deeplink 不會自動執行。"
        : "無法自動開啟 Cursor Chat。請用「複製 Prompt」後在 Agent 貼上。",
      nextSteps: [
        "確認 Cursor 已開啟本專案資料夾",
        "把複製的 prompt 貼到 Cursor Agent / Chat（若 deeplink 已預填，直接確認送出）",
        "等待 data/ai_analysis.json 被寫入",
        "回到 Dashboard，畫面會自動更新",
      ],
    };
  }
}

async function tryOpenCursorApp() {
  try {
    await execFileAsync("open", ["-a", "Cursor", ROOT]);
    return true;
  } catch {
    try {
      await execFileAsync("cursor", [ROOT]);
      return true;
    } catch {
      return false;
    }
  }
}

export async function runCursorCliAnalysis(): Promise<{ ok: boolean; output: string }> {
  const enabled = process.env.CURSOR_CLI_ENABLED !== "false";
  if (!enabled) {
    return { ok: false, output: "CURSOR_CLI_ENABLED=false" };
  }
  try {
    const { stdout, stderr } = await execFileAsync(
      "agent",
      ["-p", SHORT_PROMPT, "--workspace", ROOT],
      { cwd: ROOT, timeout: 1000 * 60 * 8, maxBuffer: 10 * 1024 * 1024 },
    );
    logEvent("ai", "Cursor CLI 分析完成");
    return { ok: true, output: stdout || stderr };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logEvent("error", "Cursor CLI 分析失敗", { message });
    return { ok: false, output: message };
  }
}
