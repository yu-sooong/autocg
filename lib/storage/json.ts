import fs from "node:fs";
import { FILES } from "../paths";
import {
  aiAnalysisSchema,
  discoveredPostSchema,
  filteredPostSchema,
  promotionConfigSchema,
  type AiAnalysisItem,
  type DiscoveredPost,
  type FilteredPost,
  type PromotionConfig,
} from "../schema";

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  const raw = fs.readFileSync(file, "utf8").trim();
  if (!raw) return fallback;
  return JSON.parse(raw) as T;
}

function writeJson(file: string, data: unknown) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function readDiscoveredPosts(): DiscoveredPost[] {
  const raw = readJson<unknown>(FILES.discovered, []);
  const parsed = discoveredPostSchema.array().safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export function writeDiscoveredPosts(posts: DiscoveredPost[]) {
  writeJson(FILES.discovered, posts);
}

export function readFilteredPosts(): FilteredPost[] {
  const raw = readJson<unknown>(FILES.filtered, []);
  const parsed = filteredPostSchema.array().safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export function writeFilteredPosts(posts: FilteredPost[]) {
  writeJson(FILES.filtered, posts);
}

export function readPromotionConfig(): PromotionConfig {
  const raw = readJson<unknown>(FILES.promotion, null);
  const parsed = promotionConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("promotion_config.json 無效或缺少必要欄位");
  }
  return parsed.data;
}

export function writePromotionConfig(config: PromotionConfig) {
  writeJson(FILES.promotion, config);
}

export function readAiAnalysis(): AiAnalysisItem[] {
  const raw = readJson<unknown>(FILES.analysis, []);
  const parsed = aiAnalysisSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export function analysisFileStat(): { exists: boolean; mtimeMs: number; size: number; hash: string } {
  if (!fs.existsSync(FILES.analysis)) {
    return { exists: false, mtimeMs: 0, size: 0, hash: "missing" };
  }
  const stat = fs.statSync(FILES.analysis);
  const buf = fs.readFileSync(FILES.analysis);
  let hash = 0;
  for (const b of buf) hash = (hash * 31 + b) | 0;
  return {
    exists: true,
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    hash: String(hash),
  };
}

export function writeText(file: string, text: string) {
  fs.writeFileSync(file, text, "utf8");
}

export function fileExists(file: string) {
  return fs.existsSync(file);
}
