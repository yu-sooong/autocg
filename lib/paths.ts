import path from "node:path";

export const ROOT = process.cwd();

export const DATA_DIR = path.join(ROOT, "data");
export const LOGS_DIR = path.join(ROOT, "logs");
export const PLAYWRIGHT_DIR = path.join(ROOT, "playwright");

export const FILES = {
  discovered: path.join(DATA_DIR, "discovered_posts.json"),
  filtered: path.join(DATA_DIR, "filtered_posts.json"),
  promotion: path.join(DATA_DIR, "promotion_config.json"),
  analysis: path.join(DATA_DIR, "ai_analysis.json"),
  mock: path.join(DATA_DIR, "mock_posts.json"),
  keywords: path.join(DATA_DIR, "keywords.json"),
  instruction: path.join(DATA_DIR, "cursor_instruction.md"),
  promptCopy: path.join(DATA_DIR, "cursor_prompt.txt"),
  aiStatus: path.join(DATA_DIR, ".ai-status.json"),
};

export const AUTH_STATE = path.join(PLAYWRIGHT_DIR, ".auth", "user.json");
export const PLAYWRIGHT_PROFILE = path.join(PLAYWRIGHT_DIR, ".profile");

export const CURSOR_PROMPT = path.join(
  ROOT,
  ".cursor",
  "prompts",
  "analyze_threads.md",
);
