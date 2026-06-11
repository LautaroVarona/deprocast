export const SOURCE_TYPES = [
  "personal_writing",
  "ai_chat",
  "ai_report",
  "web_clip",
  "book_excerpt",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const MIN_BASE_WEIGHT = 1;
export const MAX_BASE_WEIGHT = 12;

export function isSourceType(value: unknown): value is SourceType {
  return (
    typeof value === "string" && SOURCE_TYPES.includes(value as SourceType)
  );
}
