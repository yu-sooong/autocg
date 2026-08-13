import { describe, expect, it } from "vitest";
import { MockDiscoveryProvider } from "@/lib/crawler/mock";
import { filterPosts } from "@/lib/filter/posts";

describe("mock Threads crawler", () => {
  it("loads mock_posts.json and can be keyword-filtered", async () => {
    const provider = new MockDiscoveryProvider();
    const result = await provider.search(["作品"]);
    expect(result.provider).toBe("mock");
    expect(result.posts.length).toBeGreaterThan(10);
    expect(result.limitation).toMatch(/MOCK/);
    const filtered = filterPosts(result.posts, [
      "最滿意的作品",
      "分享你的作品",
      "自我介紹",
      "分享網站",
      "互相認識",
    ]);
    expect(filtered.length).toBeGreaterThan(5);
    expect(filtered.length).toBeLessThan(result.posts.length);
  });
});
