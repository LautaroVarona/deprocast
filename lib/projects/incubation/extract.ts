import "server-only";

import {
  incubationExtractionSchema,
  type IncubationExtraction,
} from "@/lib/projects/incubation/schema";
import { buildExtractionPrompt } from "@/lib/projects/incubation/prompts";
import { cohereGenerateText } from "@/lib/cohere/chat";
import { stripMarkdownFences } from "@/lib/cohere/extract";

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

  const raw = stripMarkdownFences(
    await cohereGenerateText({
      systemPrompt: prompt,
      userContent: "Extraé el estado actual.",
      modelKind: "default",
      jsonMode: true,
    }),
  );

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
