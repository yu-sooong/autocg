import { aiAnalysisSchema, type AiAnalysisItem } from "../schema";

export type AnalysisValidation =
  | { ok: true; data: AiAnalysisItem[] }
  | { ok: false; error: string };

export function validateAiAnalysisJson(input: unknown): AnalysisValidation {
  const parsed = aiAnalysisSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path?.join(".") || "(root)";
    return {
      ok: false,
      error: `AI JSON 驗證失敗：${path} ${issue?.message ?? "invalid"}`,
    };
  }

  const ids = parsed.data.map((item) => item.postId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    return { ok: false, error: "AI JSON 驗證失敗：postId 重複" };
  }

  return { ok: true, data: parsed.data };
}

export function parseAiAnalysisText(raw: string): AnalysisValidation {
  const trimmed = raw.trim();
  const unfenced = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return validateAiAnalysisJson(JSON.parse(unfenced));
  } catch (err) {
    return {
      ok: false,
      error: `不是合法 JSON：${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
