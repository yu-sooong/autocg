import { NextResponse } from "next/server";
import { prisma } from "@/lib/storage/db";
import { serializePost } from "@/lib/storage/serialize";
import { currentFilteredFromDb } from "@/lib/crawler/run";
import { readPromotionConfig } from "@/lib/storage/json";
import { CursorProvider } from "@/lib/ai/cursor";
import { logEvent } from "@/lib/logger";

export async function PATCH(req: Request) {
  const body = (await req.json()) as {
    id?: string;
    suggestedComment?: string | null;
    status?: string;
  };
  if (!body.id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  const post = await prisma.post.update({
    where: { id: body.id },
    data: {
      ...(body.suggestedComment !== undefined
        ? { suggestedComment: body.suggestedComment }
        : {}),
      ...(body.status === "skipped"
        ? { status: "skipped", skippedAt: new Date() }
        : {}),
      ...(body.status === "approved"
        ? { status: "approved", approvedAt: new Date() }
        : {}),
      ...(body.status === "needs_review" ? { status: "needs_review" } : {}),
    },
  });
  return NextResponse.json({ post: serializePost(post) });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { action?: string; id?: string };
  if (body.action === "reanalyze" && body.id) {
    const posts = (await currentFilteredFromDb()).filter((p) => p.id === body.id);
    if (!posts.length) {
      return NextResponse.json({ error: "找不到這篇 filtered post" }, { status: 404 });
    }
    const provider = new CursorProvider();
    const result = await provider.prepare({
      posts,
      config: readPromotionConfig(),
    });
    logEvent("ai", `準備重新分析 ${body.id}`);
    return NextResponse.json({
      ...result,
      message: "已準備單篇重新分析。請在 Cursor 中確認 prompt；完成後會覆寫 ai_analysis.json。",
    });
  }
  return NextResponse.json({ error: "未知動作" }, { status: 400 });
}
