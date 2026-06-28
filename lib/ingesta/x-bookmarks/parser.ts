import type { XBookmarkTweet } from "@/lib/ingesta/x-bookmarks/types";

function normalizeHandle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "@unknown";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickMediaUrls(record: Record<string, unknown>): string[] {
  const candidates = [
    record.mediaUrls,
    record.media_urls,
    record.media,
    record.images,
    record.attachments,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const urls = candidate
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          return (
            (typeof obj.url === "string" && obj.url) ||
            (typeof obj.media_url_https === "string" && obj.media_url_https) ||
            (typeof obj.preview_image_url === "string" && obj.preview_image_url) ||
            ""
          );
        }
        return "";
      })
      .filter(Boolean);
    if (urls.length > 0) return urls;
  }

  return [];
}

function mapRawRecord(record: Record<string, unknown>): XBookmarkTweet | null {
  const text = pickString(record, [
    "text",
    "full_text",
    "tweet_text",
    "content",
    "body",
    "note",
  ]);
  if (!text) return null;

  const nestedUser =
    record.user && typeof record.user === "object"
      ? (record.user as Record<string, unknown>)
      : null;

  const author =
    pickString(record, [
      "author",
      "author_name",
      "authorName",
      "name",
      "display_name",
      "user name",
    ]) ||
    pickString(nestedUser ?? {}, ["name", "display_name"]) ||
    "Autor desconocido";

  const handle = normalizeHandle(
    pickString(record, [
      "handle",
      "username",
      "screen_name",
      "author_handle",
      "authorUsername",
      "user screen name",
    ]) ||
      pickString(nestedUser ?? {}, ["screen_name", "username"]) ||
      "@unknown",
  );

  const externalId =
    pickString(record, ["id", "tweet_id", "tweetId", "external_id"]) || undefined;

  const tweetUrl =
    pickString(record, ["url", "tweet_url", "tweetUrl", "link"]) || undefined;

  return {
    externalId,
    author,
    handle,
    text,
    mediaUrls: pickMediaUrls(record),
    tweetUrl,
    bookmarkedAt:
      pickString(record, [
        "bookmarked_at",
        "bookmarkedAt",
        "created_at",
        "createdAt",
        "date",
        "scraped at",
      ]) || undefined,
  };
}

function extractRecordsFromJson(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["bookmarks", "tweets", "items", "data", "records"]) {
      const nested = obj[key];
      if (Array.isArray(nested)) {
        return nested.filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object" && !Array.isArray(item),
        );
      }
    }
    return [obj];
  }

  return [];
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(content: string): XBookmarkTweet[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const tweets: XBookmarkTweet[] = [];

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? "";
    });
    const mapped = mapRawRecord(record);
    if (mapped) tweets.push(mapped);
  }

  return tweets;
}

export function parseXBookmarkFile(
  filename: string,
  content: string,
): XBookmarkTweet[] {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".csv")) {
    return parseCsv(content);
  }

  if (lower.endsWith(".json")) {
    const data = JSON.parse(content) as unknown;
    return extractRecordsFromJson(data)
      .map(mapRawRecord)
      .filter((tweet): tweet is XBookmarkTweet => tweet !== null);
  }

  throw new Error("Formato no soportado. Usá archivos .json o .csv de marcadores de X.");
}

export function dedupeTweets(tweets: XBookmarkTweet[]): XBookmarkTweet[] {
  const seen = new Set<string>();
  const result: XBookmarkTweet[] = [];

  for (const tweet of tweets) {
    const key =
      tweet.externalId ??
      `${tweet.handle}:${tweet.text.slice(0, 120)}:${tweet.tweetUrl ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tweet);
  }

  return result;
}
