import fs from "node:fs";
import path from "node:path";
import { LOGS_DIR } from "./paths";

export type LogCategory =
  | "crawler"
  | "filter"
  | "ai"
  | "queue"
  | "send"
  | "error";

function ensureLogsDir() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export function logEvent(
  category: LogCategory,
  message: string,
  meta?: unknown,
) {
  ensureLogsDir();
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    category,
    message,
    meta: meta ?? null,
  });
  fs.appendFileSync(path.join(LOGS_DIR, `${category}.log`), line + "\n", "utf8");
  if (category === "error") {
    console.error(`[${category}] ${message}`, meta ?? "");
  } else {
    console.info(`[${category}] ${message}`);
  }
}
