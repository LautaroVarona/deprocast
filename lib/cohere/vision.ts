import "server-only";

import { getCohereModelName } from "@/lib/cohere/config";
import { getCohereClient } from "@/lib/cohere/client";
import { extractCohereText, stripMarkdownFences } from "@/lib/cohere/extract";
import { withCohereRetry } from "@/lib/cohere/retry";

export type CohereImageInput = {
  base64: string;
  mimeType: string;
};

export type CohereChatWithImagesInput = {
  systemPrompt?: string;
  images: CohereImageInput[];
  userText: string;
  model?: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
};

function toDataUrl(image: CohereImageInput): string {
  return `data:${image.mimeType};base64,${image.base64}`;
}

function buildVisionContent(
  images: CohereImageInput[],
  userText: string,
): Array<
  | { type: "text"; text: string }
  | { type: "image_url"; imageUrl: { url: string } }
> {
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; imageUrl: { url: string } }
  > = images.map((image) => ({
    type: "image_url" as const,
    imageUrl: { url: toDataUrl(image) },
  }));

  content.push({ type: "text", text: userText });
  return content;
}

export async function cohereChatWithImages(
  input: CohereChatWithImagesInput,
): Promise<string> {
  const model = input.model ?? getCohereModelName("vision");
  const client = getCohereClient();

  const messages: Array<{
    role: "system" | "user";
    content: string | ReturnType<typeof buildVisionContent>;
  }> = [];

  if (input.systemPrompt?.trim()) {
    messages.push({ role: "system", content: input.systemPrompt.trim() });
  }

  messages.push({
    role: "user",
    content: buildVisionContent(input.images, input.userText),
  });

  const response = await withCohereRetry("Cohere vision chat", () =>
    client.v2.chat({
      model,
      messages,
      temperature: input.temperature ?? 0.2,
      maxTokens: input.maxTokens ?? 8192,
      ...(input.jsonMode
        ? { responseFormat: { type: "json_object" as const } }
        : {}),
    }),
  );

  return stripMarkdownFences(extractCohereText(response));
}
