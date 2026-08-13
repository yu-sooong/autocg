import fs from "node:fs";
import { prisma } from "../storage/db";
import { FILES } from "../paths";
import { analysisFileStat, readAiAnalysis } from "../storage/json";
import { parseAiAnalysisText, validateAiAnalysisJson } from "./validate";
import { logEvent } from "../logger";
import { scoreBand } from "../schema";

export async function mergeAiAnalysis() {
  if (!fs.existsSync(FILES.analysis)) {
    return { merged: 0, error: "ai_analysis.json 尚不存在" };
  }
  const raw = fs.readFileSync(FILES.analysis, "utf8");
  const parsed = parseAiAnalysisText(raw);
  if (!parsed.ok) {
    logEvent("error", parsed.error);
    return { merged: 0, error: parsed.error };
  }

  let merged = 0;
  for (const item of parsed.data) {
    const post = await prisma.post.findUnique({ where: { id: item.postId } });
    if (!post) continue;
    const reviewing = post.status === "draft" || post.status === "needs_review";
    const nextStatus = reviewing ? "needs_review" : post.status;
    await prisma.post.update({
      where: { id: item.postId },
      data: {
        relevanceScore: item.relevanceScore,
        promotionScore: item.promotionScore,
        suitable: item.suitable,
        category: item.category,
        reason: item.reason,
        suggestedComment: item.suggestedComment,
        riskLevel: item.riskLevel,
        status: nextStatus,
      },
    });
    merged += 1;
  }

  logEvent("ai", `已合併 ${merged} 筆 AI 分析`);
  return { merged, error: undefined as string | undefined, count: parsed.data.length };
}

export async function aiStatus() {
  const stat = analysisFileStat();
  let valid = false;
  let error: string | undefined;
  let count = 0;
  if (stat.exists) {
    const parsed = validateAiAnalysisJson(readAiAnalysis());
    if (parsed.ok) {
      valid = true;
      count = parsed.data.length;
    } else {
      const raw = fs.readFileSync(FILES.analysis, "utf8");
      const retry = parseAiAnalysisText(raw);
      valid = retry.ok;
      error = retry.ok ? undefined : retry.error;
      count = retry.ok ? retry.data.length : 0;
    }
  }
  return { ...stat, valid, error, count };
}

export { scoreBand };
