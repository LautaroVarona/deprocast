"use client";

import type { NutritionAnalysis } from "@/lib/health/nutrition-types";
import type { HealthRecordDto } from "@/lib/events/types";
import type { InputModality } from "@/components/salud/types";

export type SaludIngestResponse = {
  record: HealthRecordDto;
  analysis: NutritionAnalysis;
};

export async function postSaludIngest(
  formData: FormData,
): Promise<SaludIngestResponse> {
  const response = await fetch("/api/salud/ingest", {
    method: "POST",
    body: formData,
  });
  const data = (await response.json()) as SaludIngestResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo procesar la ingesta");
  }
  return data;
}

export function buildSaludIngestFormData(input: {
  modality: InputModality;
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
