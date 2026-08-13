import type { DiscoveredPost, FilteredPost } from "../schema";
import { canonicalUrl, normalizeAuthor } from "../threads/canonical";

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/一個/g, "").replace(/\s+/g, "");
}

export function matchKeywords(text: string, keywords: string[]): string[] {
  const haystack = text.toLowerCase();
  const compact = normalizeForMatch(text);
  const hit: string[] = [];
  for (const phrase of keywords) {
    const p = phrase.trim().toLowerCase();
    if (!p) continue;
    const compactPhrase = normalizeForMatch(p);
    if (
      (haystack.includes(p) || compact.includes(compactPhrase)) &&
      !hit.includes(phrase)
    ) {
      hit.push(phrase);
    }
  }
  return hit;
}

export function filterPosts(
  posts: DiscoveredPost[],
  enabledKeywords: string[],
): FilteredPost[] {
  return posts
    .map((post) => {
      const matched = matchKeywords(post.text, enabledKeywords);
      return { ...post, matchedKeywords: matched };
    })
    .filter((post) => post.matchedKeywords.length > 0);
}

export function dedupePosts<T extends { id: string; url: string }>(posts: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const post of posts) {
    const keys = [post.id, canonicalUrl(post.url)];
    if (keys.some((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    out.push(post);
  }
  return out;
}

export function isAuthorOnCooldown(
  author: string,
  lastHandled: Date | undefined,
  cooldownDays: number,
  now = new Date(),
): boolean {
  if (!lastHandled) return false;
  const ms = cooldownDays * 24 * 60 * 60 * 1000;
  return now.getTime() - lastHandled.getTime() < ms;
}

export { normalizeAuthor };
