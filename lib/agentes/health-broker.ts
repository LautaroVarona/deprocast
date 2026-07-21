import "server-only";

import { cohereGenerateText } from "@/lib/cohere/chat";
import { stripMarkdownFences } from "@/lib/cohere/extract";
import { cohereChatWithImages } from "@/lib/cohere/vision";
import {
  healthDraftSchema,
  type HealthDraft,
  type HealthIngestModality,
} from "@/lib/health/health-broker-types";
import { transcribeSaludAudioBuffer } from "@/lib/health/transcribe-note";
import { resolveOccurredAtFromNaturalText } from "@/lib/health/time-parser";

const HEALTH_BROKER_PROMPT = `Sos health-broker de Deprocast OS.
Analizá una entrada de Salud y devolvé SOLO JSON válido con esta forma:
{
  "domain": "alimentacion|entrenamiento",
  "summary": "resumen corto",
  "occurredAtHint": "texto opcional de hora mencionada",
  "confidence": 0.0-1.0,
  "nutrition": {
    "items": [{"name":"","quantity":"","grams":0,"calories":0,"protein":0,"carbs":0,"fat":0}],
    "totals": {"calories":0,"protein":0,"carbs":0,"fat":0},
    "notes":""
  },
  "training": {
    "durationMin": 0,
    "intensity": "baja|media|alta",
    "sets": [{"exercise":"","series":0,"reps":0,"weightKg":0,"durationMin":0,"distanceKm":0}],
    "notes":""
  }
}

Reglas:
- Si es comida/bebida => domain=alimentacion.
- Si es gimnasio/ejercicio/deporte => domain=entrenamiento.
- No inventes precisión extrema; usar null/omitir cuando no se sabe.
- summary debe ser apto para tarjeta de confirmación.
- Solo incluir nutrition cuando domain=alimentacion.
- Solo incluir training cuando domain=entrenamiento.`;

const HEALTH_IMAGE_PROMPT = `Describí de forma concisa la imagen para registro de salud.
Si es comida, listá alimentos visibles y cantidades estimadas.
Si es entrenamiento, indicá ejercicio o equipo visible.
No uses markdown.`;

function fallbackDraft(raw: string): HealthDraft {
  const lower = raw.toLowerCase();
  const isFood =
    /(com[íi]|desayun|almorz|cen|pollo|arroz|manzana|ensalada|comida|plato)/.test(
      lower,
    );
  if (isFood) {
    return {
      domain: "alimentacion",
      summary: raw.slice(0, 120) || "Ingesta registrada",
      confidence: 0.35,
      nutrition: { items: [{ name: "Comida registrada", quantity: raw.slice(0, 80) }] },
    };
  }
  return {
    domain: "entrenamiento",
    summary: raw.slice(0, 120) || "Entrenamiento registrado",
    confidence: 0.35,
    training: { sets: [{ exercise: "Actividad registrada" }] },
  };
}

async function imageToText(file: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<string> {
  return cohereChatWithImages({
    systemPrompt: HEALTH_IMAGE_PROMPT,
    images: [{ base64: file.buffer.toString("base64"), mimeType: file.mimeType }],
    userText: "Describí esta captura para health-broker.",
  });
}

export async function extractHealthDraftFromText(input: string): Promise<HealthDraft> {
  const raw = stripMarkdownFences(
    await cohereGenerateText({
      systemPrompt: HEALTH_BROKER_PROMPT,
      userContent: input.trim(),
      modelKind: "fast",
      jsonMode: true,
      throttle: true,
    }),
  );

  try {
    return healthDraftSchema.parse(JSON.parse(raw));
  } catch {
    return fallbackDraft(input.trim());
  }
}

export async function ingestHealthDraft(input: {
  modality: HealthIngestModality;
  text?: string;
  occurredAt?: Date;
  file?: { buffer: Buffer; filename: string; mimeType: string };
}): Promise<{ draft: HealthDraft; sourceRaw: string; sourceChannel: HealthIngestModality; occurredAt: Date }> {
  const userText = input.text?.trim() ?? "";
  let sourceRaw = userText;

  if (input.modality === "audio" && input.file) {
    const transcript = await transcribeSaludAudioBuffer(
      input.file.buffer,
      input.file.filename,
    );
    sourceRaw = userText
      ? `${transcript.rawText}\n\nNota adicional: ${userText}`
      : transcript.rawText;
  } else if (input.modality === "image" && input.file) {
    const imageDesc = await imageToText(input.file);
    sourceRaw = userText ? `${imageDesc}\n\nNota adicional: ${userText}` : imageDesc;
  } else if (!sourceRaw) {
    throw new Error("Describí la ingesta o adjuntá imagen/audio.");
  }

  const draft = await extractHealthDraftFromText(sourceRaw);
  const occurredAt = resolveOccurredAtFromNaturalText(
    draft.occurredAtHint ? `${sourceRaw}\n${draft.occurredAtHint}` : sourceRaw,
    input.occurredAt ?? new Date(),
  );

  return {
    draft,
    sourceRaw,
    sourceChannel: input.modality,
    occurredAt,
  };
}
