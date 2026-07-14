import type {
  ActivityMetricType,
  InputModality,
} from "@/components/salud/types";

export function buildCombustibleMetrics(input: {
  modality: InputModality;
  attachmentLabel?: string;
}): Record<string, unknown> {
  const noteParts = [`modalidad:${input.modality}`];
  if (input.attachmentLabel) {
    noteParts.push(`adjunto:${input.attachmentLabel}`);
  }

  return {
    kind: "comida",
    modality: input.modality,
    note: noteParts.join("; "),
  };
}

export function intensityFromScale(value: number): "baja" | "media" | "alta" {
  if (value <= 3) return "baja";
  if (value >= 8) return "alta";
  return "media";
}

export function buildRendimientoMetrics(input: {
  metricType: ActivityMetricType;
  metricValue: number;
}): Record<string, unknown> {
  const metrics: Record<string, unknown> = {
    metricType: input.metricType,
    metricValue: input.metricValue,
  };

  if (input.metricType === "duration_min") {
    metrics.durationMin = input.metricValue;
  }

  if (input.metricType === "intensity") {
    metrics.intensity = intensityFromScale(input.metricValue);
  }

  if (input.metricType === "distance_km") {
    metrics.zone = `${input.metricValue} km`;
  }

  return metrics;
}

export function formatActivityMetric(
  metricType: ActivityMetricType,
  metricValue: number,
): string {
  switch (metricType) {
    case "duration_min":
      return `${metricValue} min`;
    case "distance_km":
      return `${metricValue} km`;
    case "intensity":
      return `Intensidad ${metricValue}/10`;
    default:
      return String(metricValue);
  }
}
