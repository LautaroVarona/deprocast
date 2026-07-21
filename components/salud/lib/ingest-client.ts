"use client";

import type {
  HealthDraft,
  HealthIngestModality,
} from "@/lib/health/health-broker-types";
import type {
  NutritionEntryDto,
  TrainingSessionDto,
} from "@/lib/health/entries-service";

export type SaludDraftResponse = {
  draft: HealthDraft;
  sourceRaw: string;
  sourceChannel: HealthIngestModality;
  occurredAt: string;
};

export async function postSaludIngestDraft(
  formData: FormData,
): Promise<SaludDraftResponse> {
  const response = await fetch("/api/salud/ingest", {
    method: "POST",
    body: formData,
  });
  const data = (await response.json()) as SaludDraftResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo procesar la ingesta");
  }
  return data;
}

export type SaludConfirmResponse = {
  nutritionEntry?: NutritionEntryDto;
  trainingSession?: TrainingSessionDto;
};

export async function confirmSaludDraft(input: {
  draft: HealthDraft;
  sourceRaw: string;
  sourceChannel: HealthIngestModality;
  occurredAt: string;
}): Promise<SaludConfirmResponse> {
  const response = await fetch("/api/salud/ingest", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as SaludConfirmResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo confirmar el borrador");
  }
  return data;
}

export function buildSaludIngestFormData(input: {
  modality: HealthIngestModality;
  text?: string;
  occurredAt: Date;
  file?: File | Blob;
  fileName?: string;
}): FormData {
  const formData = new FormData();
  formData.set("modality", input.modality);
  formData.set("occurredAt", input.occurredAt.toISOString());
  if (input.text?.trim()) {
    formData.set("text", input.text.trim());
  }
  if (input.file) {
    const name =
      input.fileName ??
      (input.file instanceof File ? input.file.name : "nota-voz.webm");
    formData.append("file", input.file, name);
  }
  return formData;
}
