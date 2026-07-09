import "server-only";

import type { CohereModelKind } from "@/lib/cohere/config";
import {
  getCohereModelName,
  pauseBetweenCohereRequests,
  getCohereConfig,
} from "@/lib/cohere/config";
import { getCohereClient } from "@/lib/cohere/client";
import { extractCohereText, stripMarkdownFences } from "@/lib/cohere/extract";
import { withCohereRetry } from "@/lib/cohere/retry";

export type CohereChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type CohereGenerateTextInput = {
  systemPrompt?: string;
  userContent: string;
  model?: string;
  modelKind?: CohereModelKind;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  throttle?: boolean;
};

function buildMessages(input: CohereGenerateTextInput): CohereChatMessage[] {
  const messages: CohereChatMessage[] = [];

  if (input.systemPrompt?.trim()) {
    messages.push({ role: "system", content: input.systemPrompt.trim() });
  }

  messages.push({ role: "user", content: input.userContent });
  return messages;
}

export async function cohereGenerateText(
  input: CohereGenerateTextInput,
): Promise<string> {
  const model =
    input.model ??
    getCohereModelName(input.modelKind ?? "default");

  if (input.throttle) {
    await pauseBetweenCohereRequests();
  }

  const config = getCohereConfig();
  const client = getCohereClient();
  const response = await withCohereRetry("Cohere chat", () =>
    client.v2.chat({
      model,
      messages: buildMessages(input),
      temperature: input.temperature ?? 0.2,
      maxTokens: input.maxTokens ?? config.maxOutputTokens,
      ...(input.jsonMode
        ? { responseFormat: { type: "json_object" as const } }
        : {}),
    }),
  );

  return stripMarkdownFences(extractCohereText(response));
}

export async function cohereGenerateJson<T = unknown>(
  input: Omit<CohereGenerateTextInput, "jsonMode">,
): Promise<T> {
  const raw = await cohereGenerateText({ ...input, jsonMode: true });
  return JSON.parse(raw) as T;
}

export { getCohereModelName };
