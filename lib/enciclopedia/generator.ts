import "server-only";

import { ENCICLOPEDIA_SYSTEM_PROMPT } from "@/lib/enciclopedia/constants";
import type { GeneratedEntryContent } from "@/lib/enciclopedia/types";
import {
  extractVertexText,
  getVertexGenerativeModel,
  getVertexModelName,
} from "@/lib/vertex-gemini/client";
import { z } from "zod";

const generatedSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  explorableTerms: z.array(z.string().min(1)).min(3).max(15),
});

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/^```(?:\w+)?\s*([\s\S]*?)```\s*$/);
  return fenced ? fenced[1].trim() : text.trim();
}

export async function generateEncyclopediaEntry(input: {
  concept: string;
  parentTitle?: string;
  triggerTerm?: string;
}): Promise<GeneratedEntryContent & { model: string }> {
  const contextLines = [
    `Concepto a explicar: ${input.concept}`,
    input.parentTitle
      ? `Contexto: el usuario exploró "${input.triggerTerm ?? input.concept}" desde la entrada "${input.parentTitle}". Mantené coherencia con ese hilo.`
      : null,
    "",
    "Generá la entrada enciclopédica en JSON según las instrucciones del sistema.",
  ]
    .filter(Boolean)
    .join("\n");

  const model = getVertexGenerativeModel(ENCICLOPEDIA_SYSTEM_PROMPT);
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: contextLines }] }],
  });

  const raw = stripMarkdownFences(extractVertexText(result));
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("La IA no devolvió JSON válido para la entrada enciclopédica.");
  }

  const validated = generatedSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      validated.error.issues[0]?.message ??
        "La respuesta de la IA no cumple el esquema esperado.",
    );
  }

  return {
    ...validated.data,
    explorableTerms: [...new Set(validated.data.explorableTerms.map((t) => t.trim()))],
    model: getVertexModelName(),
  };
}
