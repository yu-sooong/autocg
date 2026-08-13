import { describe, expect, it } from "vitest";
import { dedupePosts, filterPosts, isAuthorOnCooldown, matchKeywords } from "@/lib/filter/posts";
import { canonicalUrl, normalizeAuthor } from "@/lib/threads/canonical";

const posts = [
  {
    id: "1",
    url: "https://www.threads.com/@a/post/1",
    author: "@a",
    text: "留下你最近最滿意的一個作品，讓更多人認識你！",
    matchedKeywords: [] as string[],
  },
  {
    id: "2",
    url: "https://www.threads.net/@b/post/2?igsh=1",
    author: "b",
    text: "今天晚餐吃了超辣的麻辣鍋",
    matchedKeywords: [],
  },
];

describe("keyword filter", () => {
  it("matches enabled phrases and drops the rest", () => {
    const keywords = ["最滿意的作品", "讓更多人認識你", "麻辣鍋"];
    expect(matchKeywords(posts[0].text, keywords)).toEqual([
      "最滿意的作品",
      "讓更多人認識你",
    ]);
    const filtered = filterPosts(posts, ["最滿意的作品"]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });
});

describe("duplicate post", () => {
  it("dedupes by id and canonical URL", () => {
    const dup = [
      posts[0],
      { ...posts[0], url: "https://threads.com/@a/post/1/" },
      posts[1],
      {
        ...posts[1],
        id: "other",
        url: "https://www.threads.com/@b/post/2",
      },
    ];
    const unique = dedupePosts(dup);
    expect(unique.map((p) => p.id).sort()).toEqual(["1", "2"]);
    expect(canonicalUrl("https://www.threads.net/@x/post/9?foo=1")).toBe(
      "https://threads.com/@x/post/9",
    );
  });
});

describe("author cooldown", () => {
  it("blocks the same author within the window", () => {
    const last = new Date("2026-08-01T00:00:00.000Z");
    const now = new Date("2026-08-13T00:00:00.000Z");
    expect(isAuthorOnCooldown("@a", last, 30, now)).toBe(true);
    expect(isAuthorOnCooldown("@a", last, 7, now)).toBe(false);
    expect(normalizeAuthor("Mina")).toBe("@mina");
  });
});
