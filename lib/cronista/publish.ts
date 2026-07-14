import "server-only";

import type { ContextEventDto, HealthPillar, HealthRecordDto } from "@/lib/events/types";
import { PILLAR_LABELS } from "@/lib/events/types";
import { logActivity } from "@/lib/historial/log";

const HEALTH_PILLARS = new Set<string>([
  "rendimiento",
  "combustible",
  "recuperacion",
  "estado_base",
]);

export function isHealthPillarValue(pillar: string): pillar is HealthPillar {
  return HEALTH_PILLARS.has(pillar);
}

export function formatHealthCalendarContent(input: {
  pillar: HealthPillar;
  summary: string;
  metrics: Record<string, unknown>;
}): string {
  const totals = input.metrics.totals;
  let suffix = "";

  if (totals && typeof totals === "object" && "calories" in totals) {
    const cal = (totals as { calories?: number }).calories;
    if (typeof cal === "number") {
      suffix = ` (${Math.round(cal)} kcal)`;
    }
  }

  if (input.pillar === "combustible") {
    const kind = input.metrics.kind;
    if (kind === "comida") {
      return `Ingesta · ${input.summary}${suffix}`;
    }
    return `Combustible · ${input.summary}`;
  }

  if (input.pillar === "rendimiento") {
    const metricType = input.metrics.metricType;
    const metricValue = input.metrics.metricValue;
    if (metricType === "duration_min" && typeof metricValue === "number") {
      return `Actividad · ${input.summary} (${metricValue} min)`;
    }
    return `Actividad · ${input.summary}${suffix}`;
  }

  return `${PILLAR_LABELS[input.pillar]} · ${input.summary}${suffix}`;
}

export async function publishHealthToTimeline(input: {
  record: HealthRecordDto;
  event: ContextEventDto;
}): Promise<void> {
  await logActivity({
    occurredAt: new Date(input.record.occurredAt),
    category: "salud",
    action: "health_recorded",
    title: `Cronista: ${input.record.summary}`,
    summary: "Entrada publicada en el calendario del Observador.",
    agentId: "cronista",
    agentName: "Cronista",
    sourceType: "context_event",
    sourceRef: input.event.id,
    correlationId: input.record.id,
    metadata: {
      pillar: input.record.pillar,
      recordId: input.record.id,
      eventId: input.event.id,
    },
  });
}
