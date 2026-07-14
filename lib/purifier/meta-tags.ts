import type { PurifierReviewRecord } from "@/lib/purifier/types";

export function parseMetaTagsArray(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];

  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean).slice(0, 30);
      }
    } catch {
      // ignore
    }
  }

  return trimmed
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
    .slice(0, 30);
}

export function extractMetaTagsSecundariosFromMarkdown(markdown: string): string[] {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];

  for (const line of match[1].split("\n")) {
    const parsed = line.match(/^meta_tags_secundarios:\s*(.+)$/i);
    if (parsed?.[1]) {
      return parseMetaTagsArray(parsed[1]);
    }
  }

  return [];
}

export function resolveReviewMetaTags(record: PurifierReviewRecord): string[] {
  const tags = new Set<string>();

  for (const tag of record.metaTagsSecundarios ?? []) {
    if (tag.trim()) tags.add(tag.trim());
  }

  for (const tag of extractMetaTagsSecundariosFromMarkdown(
    record.normalizedMarkdown ?? "",
  )) {
    tags.add(tag);
  }

  const stage4 = record.stages?.find((stage) => stage.station === 4);
  if (stage4?.output) {
    try {
      const parsed = JSON.parse(stage4.output) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === "string" && item.trim()) tags.add(item.trim());
        }
      }
    } catch {
      // ignore
    }
  }

  for (const entity of record.kgExtraction?.entities ?? []) {
    const name = entity.name?.trim();
    if (name) tags.add(name);
  }

  return [...tags].slice(0, 30);
}
