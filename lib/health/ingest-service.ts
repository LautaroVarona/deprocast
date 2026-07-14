import "server-only";

import { createHealthRecord } from "@/lib/health/service";
import {
  extractNutritionFromText,
  mergeNutritionAnalyses,
} from "@/lib/health/nutrition-extract";
import type { NutritionAnalysis } from "@/lib/health/nutrition-types";
import { analyzeFoodImage } from "@/lib/health/vision-food";
import { transcribeSaludAudioBuffer } from "@/lib/health/transcribe-note";
import { logCentinelaIngestActivity } from "@/lib/health/activity-log";

export type IngestModality = "texto" | "imagen" | "audio";

export type IngestSaludMealInput = {
  modality: IngestModality;
  text?: string;
  occurredAt: Date;
  file?: { buffer: Buffer; filename: string; mimeType: string };
};

function buildCombustibleMetrics(input: {
  modality: IngestModality;
  analysis: NutritionAnalysis;
  rawTranscript?: string;
  tachoPath?: string;
  attachmentMimeType?: string;
  attachmentFilename?: string;
}): Record<string, unknown> {
  const noteParts = [`modalidad:${input.modality}`];
  if (input.attachmentFilename) {
    noteParts.push(`adjunto:${input.attachmentFilename}`);
  }
  if (input.tachoPath) {
    noteParts.push(`tacho:${input.tachoPath}`);
  }

  return {
    kind: "comida",
    modality: input.modality,
    note: noteParts.join("; "),
    items: input.analysis.items,
    totals: input.analysis.totals,
    confidence: input.analysis.confidence,
    analysisNotes: input.analysis.notes,
    rawTranscript: input.rawTranscript,
    tachoPath: input.tachoPath,
    attachmentMimeType: input.attachmentMimeType,
    analyzedBy: "nutrimetron",
  };
}

export async function ingestSaludMeal(
  input: IngestSaludMealInput,
): Promise<{
  record: Awaited<ReturnType<typeof createHealthRecord>>["record"];
  analysis: NutritionAnalysis;
}> {
  let analysis: NutritionAnalysis | null = null;
  let rawTranscript: string | undefined;
  let tachoPath: string | undefined;
  let attachmentMimeType: string | undefined;
  let attachmentFilename: string | undefined;
  const userText = input.text?.trim() ?? "";

  if (input.modality === "imagen" && input.file) {
    const vision = await analyzeFoodImage(input.file.buffer, input.file.filename);
    analysis = vision;
    tachoPath = vision.tachoPath;
    attachmentMimeType = vision.mimeType;
    attachmentFilename = input.file.filename;
    if (userText) {
      const textAnalysis = await extractNutritionFromText(
        userText,
        "Complemento textual a la imagen de ingesta.",
      );
      analysis = mergeNutritionAnalyses(vision, textAnalysis);
    }
  } else if (input.modality === "audio" && input.file) {
    const transcript = await transcribeSaludAudioBuffer(
      input.file.buffer,
      input.file.filename,
    );
    rawTranscript = transcript.rawText;
    attachmentFilename = input.file.filename;
    attachmentMimeType = input.file.mimeType;
    const combined = userText
      ? `${transcript.rawText}\n\nNota adicional: ${userText}`
      : transcript.rawText;
    analysis = await extractNutritionFromText(
      combined,
      "Transcripción de nota de voz sobre ingesta.",
    );
  } else {
    if (!userText) {
      throw new Error("Describí la ingesta o adjuntá imagen/audio.");
    }
    analysis = await extractNutritionFromText(userText);
  }

  const summary =
    analysis.summary.trim() ||
    userText.slice(0, 120) ||
    rawTranscript?.slice(0, 120) ||
    "Ingesta registrada";

  const metrics = buildCombustibleMetrics({
    modality: input.modality,
    analysis,
    rawTranscript,
    tachoPath,
    attachmentMimeType,
    attachmentFilename,
  });

  const { record } = await createHealthRecord({
    pillar: "combustible",
    occurredAt: input.occurredAt,
    summary,
    metrics,
  });

  void logCentinelaIngestActivity({
    recordId: record.id,
    summary,
    occurredAt: input.occurredAt,
    modality: input.modality,
    metadata: {
      modality: input.modality,
      routedTo: "nutrimetron",
      itemCount: analysis.items.length,
    },
  }).catch((error) => {
    console.error("[historial] centinela salud log error:", error);
  });

  return { record, analysis };
}
