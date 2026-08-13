import fs from "node:fs";
import { FILES } from "../paths";
import { discoveredPostSchema, type DiscoveredPost } from "../schema";
import { logEvent } from "../logger";
import type { DiscoveryProvider, DiscoveryResult } from "./types";

export class MockDiscoveryProvider implements DiscoveryProvider {
  id = "mock" as const;

  async search(keywords: string[]): Promise<DiscoveryResult> {
    const raw = JSON.parse(fs.readFileSync(FILES.mock, "utf8"));
    const parsed = discoveredPostSchema.array().parse(raw);
    logEvent("crawler", `Mock 發現 ${parsed.length} 篇`, { keywords });
    return {
      provider: "mock",
      posts: parsed as DiscoveredPost[],
      limitation:
        "目前為 MOCK MODE。資料來自 data/mock_posts.json，沒有實際連線 Threads。",
    };
  }
}
