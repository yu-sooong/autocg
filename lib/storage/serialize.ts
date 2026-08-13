import type { Post } from "@prisma/client";
import { prisma } from "@/lib/storage/db";

export function serializePost(post: Post) {
  return {
    ...post,
    matchedKeywords: JSON.parse(post.matchedKeywords) as string[],
    createdAt: post.createdAt?.toISOString() ?? null,
    approvedAt: post.approvedAt?.toISOString() ?? null,
    queuedAt: post.queuedAt?.toISOString() ?? null,
    sentAt: post.sentAt?.toISOString() ?? null,
    skippedAt: post.skippedAt?.toISOString() ?? null,
    discoveredAt: post.discoveredAt.toISOString(),
  };
}

export async function overviewCounts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [all, todayFound, pendingAi, recommended, needsReview, sent, failed] =
    await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { discoveredAt: { gte: today } } }),
      prisma.post.count({
        where: { status: "draft", relevanceScore: null },
      }),
      prisma.post.count({
        where: { suitable: true, promotionScore: { gte: 85 } },
      }),
      prisma.post.count({ where: { status: "needs_review" } }),
      prisma.post.count({ where: { status: "sent" } }),
      prisma.post.count({ where: { status: "failed" } }),
    ]);
  return { all, todayFound, pendingAi, recommended, needsReview, sent, failed };
}
