import { CursorProvider } from "./cursor";
import type { AIProvider } from "./provider";

export function getAIProvider(): AIProvider {
  return new CursorProvider();
}

export type { AIProvider } from "./provider";
export { CursorProvider } from "./cursor";
