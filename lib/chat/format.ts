import type {
  ChatSegment,
  ChatMentionSegment,
  ResolvedMention,
} from "@/lib/chat/types";

export function segmentsToPlainText(segments: ChatSegment[]): string {
  return segments
    .map((segment) =>
      segment.type === "text" ? segment.value : `@${segment.label}`,
    )
    .join("")
    .trim();
}

export function extractMentions(segments: ChatSegment[]): ResolvedMention[] {
  const seen = new Set<string>();
  const mentions: ResolvedMention[] = [];

  for (const segment of segments) {
    if (segment.type !== "mention") continue;
    const key = `${segment.entityType}:${segment.entityId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    mentions.push({
      entityType: segment.entityType,
      entityId: segment.entityId,
      label: segment.label,
    });
  }

  return mentions;
}

export function serializeContentDisplay(segments: ChatSegment[]): string {
  return JSON.stringify(segments);
}

export function parseContentDisplay(raw: string | null): ChatSegment[] | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isValidSegment);
  } catch {
    return null;
  }
}

function isValidSegment(value: unknown): value is ChatSegment {
  if (!value || typeof value !== "object") return false;
  const segment = value as Record<string, unknown>;
  if (segment.type === "text") {
    return typeof segment.value === "string";
  }
  if (segment.type === "mention") {
    return (
      typeof segment.entityType === "string" &&
      typeof segment.entityId === "string" &&
      typeof segment.label === "string"
    );
  }
  return false;
}

export function mergeDraftIntoSegments(
  segments: ChatSegment[],
  draftText: string,
): ChatSegment[] {
  const merged = [...segments];
  if (draftText) {
    merged.push({ type: "text", value: draftText });
  }
  return merged.filter(
    (segment) => segment.type !== "text" || segment.value.length > 0,
  );
}

export function isMentionSegment(
  segment: ChatSegment,
): segment is ChatMentionSegment {
  return segment.type === "mention";
}

export function detectMentionQuery(text: string): string | null {
  const match = text.match(/@([\w\sáéíóúñÁÉÍÓÚÑ.-]*)$/i);
  return match ? match[1] : null;
}

export function stripMentionQuery(text: string): string {
  return text.replace(/@([\w\sáéíóúñÁÉÍÓÚÑ.-]*)$/i, "");
}

export function formatHistoryForGemini(
  messages: { role: string; content: string }[],
): string {
  if (messages.length === 0) return "";
  return messages
    .map((message) => {
      const label = message.role === "assistant" ? "Asistente" : "Usuario";
      return `${label}: ${message.content}`;
    })
    .join("\n\n");
}

export function buildAutoTitle(plainText: string): string {
  const trimmed = plainText.replace(/\s+/g, " ").trim();
  if (!trimmed) return "Nueva conversación";
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
}
