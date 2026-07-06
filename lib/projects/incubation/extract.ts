import "server-only";

import {
  incubationExtractionSchema,
  type IncubationExtraction,
} from "@/lib/projects/incubation/schema";
import { buildExtractionPrompt } from "@/lib/projects/incubation/prompts";
import {
  extractVertexText,
  getVertexGenerativeModel,
} from "@/lib/vertex-gemini/client";
import { withVertexRetry } from "@/lib/vertex-gemini/retry";

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/^```(?:\w+)?\s*([\s\S]*?)```\s*$/);
  return fenced ? fenced[1].trim() : text.trim();
}

function mergeStringField(prev: string | undefined, next: string | undefined): string | undefined {
  const trimmed = next?.trim();
  if (trimmed) return trimmed;
  return prev?.trim() || undefined;
}

function mergeStringArray(prev: string[], next: string[]): string[] {
  const combined = [...prev, ...next]
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(combined)];
}

export function mergeExtraction(
  previous: IncubationExtraction,
  incoming: IncubationExtraction,
): IncubationExtraction {
  return incubationExtractionSchema.parse({
    identidad: {
      nombre: mergeStringField(previous.identidad.nombre, incoming.identidad.nombre),
      origen_tiempo: mergeStringField(
        previous.identidad.origen_tiempo,
        incoming.identidad.origen_tiempo,
      ),
      proyeccion: mergeStringField(
        previous.identidad.proyeccion,
        incoming.identidad.proyeccion,
      ),
    },
    ecosistema: {
      personas: mergeStringArray(
        previous.ecosistema.personas,
        incoming.ecosistema.personas,
      ),
      recursos: mergeStringArray(
        previous.ecosistema.recursos,
        incoming.ecosistema.recursos,
      ),
    },
    ejecucion: {
      estado_actual: mergeStringField(
        previous.ejecucion.estado_actual,
        incoming.ejecucion.estado_actual,
      ),
      siguientes_pasos: mergeStringArray(
        previous.ejecucion.siguientes_pasos,
        incoming.ejecucion.siguientes_pasos,
      ),
    },
    campoSlug: incoming.campoSlug ?? previous.campoSlug,
    tipo: incoming.tipo ?? previous.tipo,
    completitud: {
      identidad: incoming.completitud.identidad || previous.completitud.identidad,
      ecosistema: incoming.completitud.ecosistema || previous.completitud.ecosistema,
      ejecucion: incoming.completitud.ejecucion || previous.completitud.ejecucion,
    },
  });
}

export async function extractIncubationState(
  transcript: string,
  previousState: IncubationExtraction,
): Promise<IncubationExtraction> {
  const prompt = buildExtractionPrompt(transcript, previousState);
  const model = getVertexGenerativeModel(prompt);

  const result = await withVertexRetry("Incubation extraction", () =>
    model.generateContent({
      contents: [{ role: "user", parts: [{ text: "Extraé el estado actual." }] }],
    }),
  );

  const raw = stripMarkdownFences(extractVertexText(result));

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return previousState;
  }

  const validated = incubationExtractionSchema.safeParse(parsed);
  if (!validated.success) {
    return previousState;
  }

  return mergeExtraction(previousState, validated.data);
}
