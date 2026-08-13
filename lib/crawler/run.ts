import { prisma } from "../storage/db";
import {
  readFilteredPosts,
  writeDiscoveredPosts,
  writeFilteredPosts,
} from "../storage/json";
import { dedupePosts, filterPosts, isAuthorOnCooldown, normalizeAuthor } from "../filter/posts";
import { getDiscoveryProvider } from "../crawler";
import { canonicalUrl } from "../threads/canonical";
import { logEvent } from "../logger";
import type { FilteredPost } from "../schema";

export async function getEnabledKeywords() {
  const rows = await prisma.keyword.findMany({
    where: { enabled: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => row.phrase);
}

export async function runDiscovery() {
  const keywords = await getEnabledKeywords();
  if (keywords.length === 0) {
    throw new Error("沒有啟用的關鍵字");
  }

  const provider = getDiscoveryProvider();
  const result = await provider.search(keywords);
  const discovered = dedupePosts(result.posts);
  writeDiscoveredPosts(discovered);

  const filtered = filterPosts(discovered, keywords);
  const uniqueFiltered = dedupePosts(filtered);

  const settings = await prisma.queueControl.upsert({
    where: { id: "default" },
    update: {},
    create: {},
  });

  const existing = await prisma.post.findMany({
    select: { id: true, url: true, author: true, status: true },
  });
  const existingIds = new Set(existing.map((p) => p.id));
  const existingUrls = new Set(existing.map((p) => canonicalUrl(p.url)));

  const cooldowns = await prisma.authorCooldown.findMany();
  const cooldownMap = new Map(
    cooldowns.map((c) => [normalizeAuthor(c.author), c.lastHandled]),
  );

  const accepted: FilteredPost[] = [];
  let skippedDup = 0;
  let skippedCooldown = 0;

  for (const post of uniqueFiltered) {
    if (existingIds.has(post.id) || existingUrls.has(canonicalUrl(post.url))) {
      skippedDup += 1;
      continue;
    }
    const author = normalizeAuthor(post.author);
    if (
      isAuthorOnCooldown(
        author,
        cooldownMap.get(author),
        settings.authorCooldownDays,
      )
    ) {
      skippedCooldown += 1;
      continue;
    }
    accepted.push({ ...post, author });
  }

  writeFilteredPosts(accepted);

  if (accepted.length > 0) {
    await prisma.post.createMany({
      data: accepted.map((post) => ({
        id: post.id,
        url: post.url,
        author: post.author,
        text: post.text,
        createdAt: post.createdAt ? new Date(post.createdAt) : null,
        matchedKeywords: JSON.stringify(post.matchedKeywords),
        source: result.provider,
        status: "draft",
      })),
    });
  }

  logEvent("filter", `過濾後新增 ${accepted.length} 篇`, {
    discovered: discovered.length,
    matched: uniqueFiltered.length,
    skippedDup,
    skippedCooldown,
  });

  return {
    provider: result.provider,
    limitation: result.limitation,
    error: result.error,
    discovered: discovered.length,
    matched: uniqueFiltered.length,
    added: accepted.length,
    skippedDup,
    skippedCooldown,
    filtered: accepted,
  };
}

export async function currentFilteredFromDb(): Promise<FilteredPost[]> {
  const fromFile = readFilteredPosts();
  if (fromFile.length) return fromFile;
  const rows = await prisma.post.findMany({
    where: { status: { in: ["draft", "needs_review"] } },
  });
  return rows.map((row) => ({
    id: row.id,
    url: row.url,
    author: row.author,
    text: row.text,
    createdAt: row.createdAt?.toISOString(),
    matchedKeywords: JSON.parse(row.matchedKeywords) as string[],
  }));
}
