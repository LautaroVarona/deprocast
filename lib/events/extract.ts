import "server-only";

import type { LlmExtractionResult } from "@/lib/events/types";
import { llmExtractionResultSchema } from "@/lib/events/types";
import { cohereGenerateText } from "@/lib/cohere/chat";
import { stripMarkdownFences } from "@/lib/cohere/extract";

const EXTRACTION_PROMPT = `Sos un extractor de eventos para Deprocast. Analizá el texto y devolvé ÚNICAMENTE JSON válido (sin markdown) con esta forma:
{
  "events": [
    {
      "pillar": "rendimiento|combustible|recuperacion|estado_base|proyecto|general",
      "summary": "resumen corto",
      "structuredData": { },
      "projectLinks": [{ "projectLabel": "nombre", "note": "hito opcional" }]
    }
  ]
}

Reglas:
- pillar rendimiento: entrenamientos, cargas, rutinas (structuredData: blockType, zone, durationMin, intensity)
- pillar combustible: ayuno, agua, suplementos, comidas saltadas (structuredData: kind, value, unit, note)
- pillar recuperacion: sueño, HRV, estrés (structuredData: sleepHours, quality, hrv)
- pillar estado_base: energía/foco/claridad (structuredData: period am|pm, energy, focus, clarity 1-10)
- pillar proyecto: hitos de proyectos mencionados (structuredData: note)
- Si no hay eventos detectables, devolvé { "events": [] }
- No inventes métricas numéricas que no estén en el texto`;

export async function extractEventsFromText(
  text: string,
): Promise<LlmExtractionResult> {
  const raw = stripMarkdownFences(
    await cohereGenerateText({
      systemPrompt: EXTRACTION_PROMPT,
      userContent: text,
      modelKind: "fast",
      jsonMode: true,
      throttle: true,
    }),
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { events: [] };
  }

  const validated = llmExtractionResultSchema.safeParse(parsed);
  if (!validated.success) {
    return { events: [] };
  }

  return validated.data;
}
