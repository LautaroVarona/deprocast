import "server-only";

import type { LlmExtractionResult } from "@/lib/events/types";
import { llmExtractionResultSchema } from "@/lib/events/types";
import {
  extractVertexText,
  getVertexGenerativeModel,
} from "@/lib/vertex-gemini/client";

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

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/^```(?:\w+)?\s*([\s\S]*?)```\s*$/);
  return fenced ? fenced[1].trim() : text.trim();
}

export async function extractEventsFromText(
  text: string,
): Promise<LlmExtractionResult> {
  const model = getVertexGenerativeModel(EXTRACTION_PROMPT);
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text }] }],
  });
  const raw = stripMarkdownFences(extractVertexText(result));

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
