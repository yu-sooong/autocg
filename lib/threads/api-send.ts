import { logEvent } from "../logger";
import type { SendProvider, SendResult } from "../crawler/types";

const API_BASE =
  process.env.THREADS_API_BASE ?? "https://graph.threads.com/v1.0";

export class ThreadsApiSendProvider implements SendProvider {
  id = "api" as const;

  async reply(input: {
    postId: string;
    url: string;
    comment: string;
  }): Promise<SendResult> {
    const token = process.env.THREADS_ACCESS_TOKEN;
    const userId = process.env.THREADS_USER_ID ?? "me";
    if (!token) {
      return {
        ok: false,
        error: "尚未設定 THREADS_ACCESS_TOKEN",
        limitation: "官方發 reply 需要 threads_basic + threads_content_publish + threads_manage_replies。24h 上限 1,000 則。",
      };
    }

    try {
      const create = await fetch(`${API_BASE}/${userId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "TEXT",
          text: input.comment,
          reply_to_id: input.postId,
          access_token: token,
        }),
      });
      const created = (await create.json()) as { id?: string; error?: { message?: string } };
      if (!create.ok || !created.id) {
        return {
          ok: false,
          error: created.error?.message ?? "建立 reply container 失敗",
        };
      }

      const publish = await fetch(`${API_BASE}/${userId}/threads_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: created.id,
          access_token: token,
        }),
      });
      const published = (await publish.json()) as { id?: string; error?: { message?: string } };
      if (!publish.ok) {
        return { ok: false, error: published.error?.message ?? "publish 失敗" };
      }

      logEvent("send", `API 已回覆 ${input.postId}`);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
