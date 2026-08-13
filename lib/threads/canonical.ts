export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    u.search = "";
    u.hostname = u.hostname.replace(/^www\./, "");
    if (u.hostname === "threads.net") u.hostname = "threads.com";
    let pathname = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${u.hostname}${pathname}`;
  } catch {
    return raw.trim();
  }
}

export function postKey(id: string, url: string): string {
  return `${id}::${canonicalUrl(url)}`;
}

export function normalizeAuthor(author: string): string {
  const trimmed = author.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith("@") ? trimmed.toLowerCase() : `@${trimmed.toLowerCase()}`;
}
