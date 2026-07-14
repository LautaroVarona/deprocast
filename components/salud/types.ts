import type { HealthPillar, HealthRecordDto } from "@/lib/events/types";

export type SaludTab = "telemetria" | "alimentacion" | "deporte" | "mas";

export type TimestampMode = "now" | "30min" | "specific";

export type InputModality = "texto" | "audio" | "imagen";

export type ActivityMetricType = "duration_min" | "distance_km" | "intensity";

export interface Comida {
  id: string;
  descripcion: string;
  occurredAt: string;
  modality: InputModality;
  attachmentLabel?: string;
}

export interface Actividad {
  id: string;
  descripcion: string;
  occurredAt: string;
  metricType: ActivityMetricType;
  metricValue: number;
}

function parseModality(value: unknown): InputModality {
  if (value === "audio" || value === "imagen") return value;
  return "texto";
}

function parseMetricType(value: unknown): ActivityMetricType {
  if (value === "distance_km" || value === "intensity") return value;
  if (typeof value === "object" && value !== null) {
    const metrics = value as Record<string, unknown>;
    if (metrics.intensity !== undefined) return "intensity";
    if (metrics.durationMin !== undefined) return "duration_min";
  }
  return "duration_min";
}

function parseMetricValue(
  metrics: Record<string, unknown>,
  metricType: ActivityMetricType,
): number {
  if (typeof metrics.metricValue === "number") return metrics.metricValue;
  if (metricType === "duration_min" && typeof metrics.durationMin === "number") {
    return metrics.durationMin;
  }
  if (metricType === "intensity") {
    const intensity = metrics.intensity;
    if (intensity === "baja") return 2;
    if (intensity === "alta") return 9;
    if (intensity === "media") return 5;
  }
  return 0;
}

export function recordToComida(record: HealthRecordDto): Comida | null {
  if (record.pillar !== "combustible") return null;
  const metrics = record.metrics;
  if (metrics.kind !== "comida") return null;

  const note = typeof metrics.note === "string" ? metrics.note : undefined;
  const attachmentMatch = note?.match(/adjunto:([^;]+)/);
  const attachmentLabel = attachmentMatch?.[1]?.trim();

  return {
    id: record.id,
    descripcion: record.summary,
    occurredAt: record.occurredAt,
    modality: parseModality(metrics.modality),
    attachmentLabel,
  };
}

export function recordToActividad(record: HealthRecordDto): Actividad | null {
  if (record.pillar !== "rendimiento") return null;

  const metrics = record.metrics;
  const metricType = parseMetricType(metrics.metricType ?? metrics);

  return {
    id: record.id,
    descripcion: record.summary,
    occurredAt: record.occurredAt,
    metricType,
    metricValue: parseMetricValue(metrics, metricType),
  };
}

export const SALUD_TAB_TO_PILLAR: Partial<Record<SaludTab, HealthPillar>> = {
  telemetria: "recuperacion",
  alimentacion: "combustible",
  deporte: "rendimiento",
  mas: "estado_base",
};
