import { CohereError } from "@/lib/cohere/errors";

type ContentPart = {
  type?: string;
  text?: string;
};

type ChatMessage = {
  role?: string;
  content?: string | ContentPart[] | { text?: string };
};

type ChatResponse = {
  message?: ChatMessage;
  finishReason?: string;
};

function extractFromContentPart(part: ContentPart | { text?: string }): string {
  if ("text" in part && typeof part.text === "string") {
    return part.text;
  }
  if ("type" in part && part.type === "text" && typeof part.text === "string") {
    return part.text;
  }
  return "";
}

export function extractCohereText(response: ChatResponse): string {
  const content = response.message?.content;

  if (typeof content === "string") {
    const trimmed = content.trim();
    if (trimmed) return trimmed;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => extractFromContentPart(part))
      .join("")
      .trim();
    if (text) return text;
  }

  if (content && typeof content === "object" && "text" in content) {
    const text = String((content as { text?: string }).text ?? "").trim();
    if (text) return text;
  }

  const finishReason = response.finishReason ?? "sin contenido";
  throw new CohereError(
    `Cohere devolvió una respuesta vacía (${finishReason}).`,
  );
}

export function stripMarkdownFences(text: string): string {
  const fenced = text.match(/^```(?:\w+)?\s*([\s\S]*?)```\s*$/);
  return fenced ? fenced[1].trim() : text.trim();
}
