import {
  arrayToStrictMetaTags,
  normalizeStrictMetaTags,
  parseStrictMetaTagsJson,
  strictMetaTagsToArray,
  type StrictMetaTags,
} from "@/lib/purifier/meta-tags-taxonomy";
import type { PurifierReviewRecord } from "@/lib/purifier/types";

export function parseMetaTagsArray(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];

  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    return strictMetaTagsToArray(parseStrictMetaTagsJson(trimmed));
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return strictMetaTagsToArray(normalizeStrictMetaTags(parsed));
      }
    } catch {
      // ignore
    }
  }

  return strictMetaTagsToArray(
    arrayToStrictMetaTags(
      trimmed
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean),
    ),
  );
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

export function resolveStrictMetaTags(
  record: PurifierReviewRecord,
): StrictMetaTags {
  if (record.strictMetaTags) {
    return normalizeStrictMetaTags(record.strictMetaTags);
  }

  if (record.metaTagsSecundarios?.length) {
    return normalizeStrictMetaTags(record.metaTagsSecundarios);
  }

  const fromMarkdown = extractMetaTagsSecundariosFromMarkdown(
    record.normalizedMarkdown ?? "",
  );
  if (fromMarkdown.length) {
    return normalizeStrictMetaTags(fromMarkdown);
  }

  const stage4 = record.stages?.find((stage) => stage.station === 4);
  if (stage4?.output) {
    return parseStrictMetaTagsJson(stage4.output);
  }

  return normalizeStrictMetaTags(null);
}

/** Siempre exactamente 6 etiquetas en orden de taxonomía. */
export function resolveReviewMetaTags(record: PurifierReviewRecord): string[] {
  return strictMetaTagsToArray(resolveStrictMetaTags(record));
}
