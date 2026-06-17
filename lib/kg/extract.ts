import type { GenerativeModel } from "@google-cloud/vertexai";
import { parseLlmKgExtraction } from "@/lib/kg/parse";
import { KG_EXTRACT_PROMPT } from "@/lib/kg/prompts";
import type { LlmKgExtraction } from "@/lib/kg/types";
import {
  extractVertexText,
  getVertexGenerativeModel,
} from "@/lib/vertex-gemini/client";

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/^```(?:\w+)?\s*([\s\S]*?)```\s*$/);
  return fenced ? fenced[1].trim() : text.trim();
}

export async function extractKgFromText(
  text: string,
  model?: GenerativeModel,
): Promise<LlmKgExtraction> {
  const vertexModel = model ?? getVertexGenerativeModel(KG_EXTRACT_PROMPT);
  const result = await vertexModel.generateContent({
    contents: [{ role: "user", parts: [{ text }] }],
  });
  const raw = stripMarkdownFences(extractVertexText(result));
  return parseLlmKgExtraction(raw);
}
