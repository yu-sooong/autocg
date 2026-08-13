import { describe, expect, it } from "vitest";
import { parseAiAnalysisText, validateAiAnalysisJson } from "@/lib/ai/validate";
import { scoreBand, scoreBandLabel } from "@/lib/schema";

const validItem = {
  postId: "123",
  relevanceScore: 90,
  promotionScore: 88,
  suitable: true,
  category: "作品分享",
  reason: "鼓勵分享作品",
  suggestedComment: "這個活動很有意思！",
  riskLevel: "low" as const,
};

describe("AI JSON validation", () => {
  it("accepts a valid array", () => {
    const result = validateAiAnalysisJson([validItem]);
    expect(result.ok).toBe(true);
  });

  it("rejects duplicate postId and invalid scores", () => {
    expect(validateAiAnalysisJson([validItem, validItem]).ok).toBe(false);
    expect(
      validateAiAnalysisJson([{ ...validItem, promotionScore: 120 }]).ok,
    ).toBe(false);
  });

  it("strips markdown fences", () => {
    const raw = "```json\n" + JSON.stringify([validItem]) + "\n```";
    const parsed = parseAiAnalysisText(raw);
    expect(parsed.ok).toBe(true);
  });
});

describe("promotion score bands", () => {
  it("maps 0-39 / 40-69 / 70-84 / 85-100", () => {
    expect(scoreBand(0)).toBe("unsuitable");
    expect(scoreBand(39)).toBe("unsuitable");
    expect(scoreBand(40)).toBe("average");
    expect(scoreBand(69)).toBe("average");
    expect(scoreBand(70)).toBe("consider");
    expect(scoreBand(84)).toBe("consider");
    expect(scoreBand(85)).toBe("high");
    expect(scoreBand(100)).toBe("high");
    expect(scoreBandLabel(96)).toBe("高度適合");
  });
});
