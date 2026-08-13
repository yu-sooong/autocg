import fs from "node:fs";
import { NextResponse } from "next/server";
import { aiStatus, mergeAiAnalysis } from "@/lib/ai/merge";
import { providerStatus } from "@/lib/crawler";
import { THREADS_LIMITATIONS } from "@/lib/limitations";
import { FILES } from "@/lib/paths";
import { queueSnapshot } from "@/lib/queue/engine";
import { prisma } from "@/lib/storage/db";
import { readPromotionConfig } from "@/lib/storage/json";
import { ensureSeed } from "@/lib/storage/seed";
import { overviewCounts, serializePost } from "@/lib/storage/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const status = await aiStatus();
  if (status.exists && status.valid) {
    await mergeAiAnalysis();
  }

  const [counts, keywords, posts, queue, promotion] = await Promise.all([
    overviewCounts(),
    prisma.keyword.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.post.findMany({ orderBy: { discoveredAt: "desc" } }),
    queueSnapshot(),
    Promise.resolve(readPromotionConfig()),
  ]);

  return NextResponse.json({
    counts,
    keywords,
    posts: posts.map(serializePost),
    queue,
    promotion,
    providers: providerStatus(),
    ai: status,
    files: {
      filtered: fs.existsSync(FILES.filtered),
      promotion: fs.existsSync(FILES.promotion),
      analysis: fs.existsSync(FILES.analysis),
    },
    limitations: [...THREADS_LIMITATIONS],
  });
}
