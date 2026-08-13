import { logEvent } from "../logger";
import type { DiscoveredPost } from "../schema";
import type { DiscoveryProvider, DiscoveryResult } from "../crawler/types";

const API_BASE =
  process.env.THREADS_API_BASE ?? "https://graph.threads.com/v1.0";

type ThreadsSearchItem = {
  id?: string;
  text?: string;
  permalink?: string;
  timestamp?: string;
  username?: string;
};

export class ThreadsApiDiscoveryProvider implements DiscoveryProvider {
  id = "api" as const;

  async search(keywords: string[]): Promise<DiscoveryResult> {
    const token = process.env.THREADS_ACCESS_TOKEN;
    if (!token) {
      return {
        provider: "api",
        posts: [],
        error: "尚未設定 THREADS_ACCESS_TOKEN",
        limitation:
          "官方 Keyword Search 需要 Meta App、OAuth token，以及 App Review 核准 threads_keyword_search，否則只能搜到自己的貼文。",
      };
    }

    const posts: DiscoveredPost[] = [];
    const errors: string[] = [];

    for (const keyword of keywords) {
      try {
        const url = new URL(`${API_BASE}/keyword_search`);
        url.searchParams.set("q", keyword);
        url.searchParams.set("search_mode", "KEYWORD");
        url.searchParams.set("search_type", "RECENT");
        url.searchParams.set(
          "fields",
          "id,text,media_type,permalink,timestamp,username,has_replies,is_quote_post,is_reply",
        );
        url.searchParams.set("limit", "25");
        url.searchParams.set("access_token", token);

        const res = await fetch(url);
        const json = (await res.json()) as {
          data?: ThreadsSearchItem[];
          error?: { message?: string };
        };
        if (!res.ok) {
          errors.push(`${keyword}: ${json.error?.message ?? res.statusText}`);
          continue;
        }
        for (const item of json.data ?? []) {
          if (!item.id || !item.permalink) continue;
          posts.push({
            id: item.id,
            url: item.permalink,
            author: item.username ? `@${item.username}` : "@unknown",
            text: item.text ?? "",
            createdAt: item.timestamp,
            matchedKeywords: [],
          });
        }
      } catch (err) {
        errors.push(`${keyword}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    logEvent("crawler", `API 發現 ${posts.length} 篇`, { errors });
    return {
      provider: "api",
      posts,
      error: errors.length ? errors.join("；") : undefined,
      limitation:
        "公開關鍵字搜尋需 threads_keyword_search 通過 App Review。官方上限約 2,200 queries / 使用者 / 24h。OAuth redirect 不支援 localhost。",
    };
  }
}
