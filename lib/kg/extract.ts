import "server-only";

import { parseLlmKgExtraction } from "@/lib/kg/parse";
import { KG_EXTRACT_PROMPT } from "@/lib/kg/prompts";
import type { LlmKgExtraction } from "@/lib/kg/types";
import { cohereGenerateText } from "@/lib/cohere/chat";
import { stripMarkdownFences } from "@/lib/cohere/extract";

export async function extractKgFromText(
  text: string,
  model?: string,
): Promise<LlmKgExtraction> {
  const raw = stripMarkdownFences(
    await cohereGenerateText({
      systemPrompt: KG_EXTRACT_PROMPT,
      userContent: text,
      model,
      modelKind: "fast",
      jsonMode: true,
      throttle: true,
    }),
  );
  return parseLlmKgExtraction(raw);
}
