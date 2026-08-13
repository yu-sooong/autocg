import type { DiscoveredPost } from "../schema";

export type DiscoveryResult = {
  provider: "mock" | "api" | "playwright";
  posts: DiscoveredPost[];
  limitation?: string;
  error?: string;
};

export interface DiscoveryProvider {
  id: "mock" | "api" | "playwright";
  search(keywords: string[]): Promise<DiscoveryResult>;
}

export interface SendResult {
  ok: boolean;
  mock?: boolean;
  error?: string;
  limitation?: string;
}

export interface SendProvider {
  id: "mock" | "api" | "playwright";
  reply(input: {
    postId: string;
    url: string;
    comment: string;
  }): Promise<SendResult>;
}
