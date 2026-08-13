import { z } from "zod";

export const postStatusSchema = z.enum([
  "draft",
  "needs_review",
  "approved",
  "queued",
  "sending",
  "sent",
  "failed",
  "skipped",
]);

export type PostStatus = z.infer<typeof postStatusSchema>;

export const discoveredPostSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  author: z.string().min(1),
  text: z.string(),
  createdAt: z.string().optional(),
  matchedKeywords: z.array(z.string()).default([]),
});

export const filteredPostSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  author: z.string().min(1),
  text: z.string(),
  createdAt: z.string().optional(),
  matchedKeywords: z.array(z.string()),
});

export const promotionConfigSchema = z.object({
  websiteName: z.string().min(1),
  websiteUrl: z.string().url(),
  description: z.string().min(1),
  targetAudience: z.array(z.string()).min(1),
  promotionTopics: z.array(z.string()).min(1),
  tone: z.string().min(1),
});

export const riskLevelSchema = z.enum(["low", "medium", "high"]);

export const aiAnalysisItemSchema = z.object({
  postId: z.string().min(1),
  relevanceScore: z.number().int().min(0).max(100),
  promotionScore: z.number().int().min(0).max(100),
  suitable: z.boolean(),
  category: z.string().min(1),
  reason: z.string().min(1),
  suggestedComment: z.string().nullable(),
  riskLevel: riskLevelSchema,
});

export const aiAnalysisSchema = z.array(aiAnalysisItemSchema);

export const keywordSchema = z.object({
  id: z.string(),
  phrase: z.string().min(1),
  enabled: z.boolean(),
});

export type DiscoveredPost = z.infer<typeof discoveredPostSchema>;
export type FilteredPost = z.infer<typeof filteredPostSchema>;
export type PromotionConfig = z.infer<typeof promotionConfigSchema>;
export type AiAnalysisItem = z.infer<typeof aiAnalysisItemSchema>;
export type Keyword = z.infer<typeof keywordSchema>;

export function scoreBand(score: number): "unsuitable" | "average" | "consider" | "high" {
  if (score <= 39) return "unsuitable";
  if (score <= 69) return "average";
  if (score <= 84) return "consider";
  return "high";
}

export function scoreBandLabel(score: number): string {
  const band = scoreBand(score);
  return {
    unsuitable: "不適合",
    average: "普通",
    consider: "值得考慮",
    high: "高度適合",
  }[band];
}
