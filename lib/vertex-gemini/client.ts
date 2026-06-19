import "server-only";

import {
  VertexAI,
  type GenerativeModel,
  type GenerateContentResult,
} from "@google-cloud/vertexai";

import { getVertexGeminiConfig } from "@/lib/vertex-gemini/config";
import { VertexGeminiError } from "@/lib/vertex-gemini/errors";

export type { GenerativeModel };

let cachedVertex: VertexAI | null = null;

export function getVertexAI(): VertexAI {
  if (cachedVertex) {
    return cachedVertex;
  }

  const config = getVertexGeminiConfig();
  cachedVertex = new VertexAI({
    project: config.projectId,
    location: config.location,
    googleAuthOptions: {
      keyFilename: config.credentialsPath,
    },
  });

  return cachedVertex;
}

export function getVertexGenerativeModel(
  systemPrompt?: string,
): GenerativeModel {
  const config = getVertexGeminiConfig();
  const vertex = getVertexAI();

  return vertex.getGenerativeModel({
    model: config.model,
    ...(systemPrompt
      ? {
          systemInstruction: {
            role: "system",
            parts: [{ text: systemPrompt }],
          },
        }
      : {}),
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });
}

export function getVertexModelName(): string {
  return getVertexGeminiConfig().model;
}

export function extractVertexText(result: GenerateContentResult): string {
  const candidate = result.response.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    const blockReason = candidate?.finishReason ?? "sin candidatos";
    throw new VertexGeminiError(
      `Vertex Gemini devolvió una respuesta vacía (${blockReason}).`,
    );
  }

  return text;
}
