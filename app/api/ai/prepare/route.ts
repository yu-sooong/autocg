import { NextResponse } from "next/server";
import { currentFilteredFromDb } from "@/lib/crawler/run";
import { readPromotionConfig } from "@/lib/storage/json";
import { CursorProvider } from "@/lib/ai/cursor";
import { logEvent } from "@/lib/logger";
import fs from "node:fs";
import { FILES } from "@/lib/paths";

export async function POST() {
  try {
    if (!fs.existsSync(FILES.filtered) || fs.readFileSync(FILES.filtered, "utf8").trim() === "[]") {
      const posts = await currentFilteredFromDb();
      if (!posts.length) {
        return NextResponse.json(
          { error: "filtered_posts.json 不存在或沒有待分析貼文，請先海巡。" },
          { status: 400 },
        );
      }
    }
    if (!fs.existsSync(FILES.promotion)) {
      return NextResponse.json({ error: "promotion_config.json 不存在" }, { status: 400 });
    }
    const provider = new CursorProvider();
    const result = await provider.prepare({
      posts: await currentFilteredFromDb(),
      config: readPromotionConfig(),
    });
    logEvent("ai", "已交給 Cursor AI");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
