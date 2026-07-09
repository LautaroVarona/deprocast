import "server-only";

import { ENCICLOPEDIA_SYSTEM_PROMPT } from "@/lib/enciclopedia/constants";
import type { GeneratedEntryContent } from "@/lib/enciclopedia/types";
import { cohereGenerateText, getCohereModelName } from "@/lib/cohere/chat";
import { stripMarkdownFences } from "@/lib/cohere/extract";
import { z } from "zod";

const generatedSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  explorableTerms: z.array(z.string().min(1)).min(3).max(15),
});

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

  const raw = stripMarkdownFences(
    await cohereGenerateText({
      systemPrompt: ENCICLOPEDIA_SYSTEM_PROMPT,
      userContent: contextLines,
      modelKind: "default",
      jsonMode: true,
    }),
  );

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
    model: getCohereModelName("default"),
  };
}
