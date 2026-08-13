import type { AiAnalysisItem, FilteredPost, PromotionConfig } from "../schema";

export interface PrepareAnalysisResult {
  ok: boolean;
  prompt: string;
  deeplink: string;
  instructionPath: string;
  openedCursor: boolean;
  openedDeeplink: boolean;
  cliAvailable: boolean;
  message: string;
  nextSteps: string[];
}

export interface AIProvider {
  id: string;
  prepare(input: {
    posts: FilteredPost[];
    config: PromotionConfig;
  }): Promise<PrepareAnalysisResult>;
}

export type FutureProviderId =
  | "cursor"
  | "openai"
  | "gemini"
  | "grok"
  | "local-llm";

export function unsupportedApiProvider(id: Exclude<FutureProviderId, "cursor">): AIProvider {
  return {
    id,
    async prepare() {
      throw new Error(
        `${id} 不是第一版必要條件。請使用 CursorProvider（JSON + Cursor Chat / Agent）。`,
      );
    },
  };
}
