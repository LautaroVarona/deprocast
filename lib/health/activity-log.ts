import "server-only";

import type { HealthPillar } from "@/lib/events/types";
import { logActivity } from "@/lib/historial/log";

const HEALTH_AGENT_BY_PILLAR: Record<
  HealthPillar,
  { agentId: string; agentName: string }
> = {
  combustible: { agentId: "nutrimetron", agentName: "Nutrimetron" },
  rendimiento: { agentId: "kinetometro", agentName: "Kinetómetro" },
  recuperacion: { agentId: "somatometron", agentName: "Somatometrón" },
  estado_base: { agentId: "ambientografo", agentName: "Ambientógrafo" },
};

export async function logHealthSpecialistActivity(input: {
  recordId: string;
  pillar: HealthPillar;
  pillarLabel: string;
  summary: string;
  occurredAt: Date;
  metrics: Record<string, unknown>;
}): Promise<void> {
  const agent = HEALTH_AGENT_BY_PILLAR[input.pillar];
  await logActivity({
    occurredAt: input.occurredAt,
    category: "salud",
    action: "health_recorded",
    title: `${input.pillarLabel}: ${input.summary}`,
    summary: input.summary,
    agentId: agent.agentId,
    agentName: agent.agentName,
    sourceType: "health_record",
    sourceRef: input.recordId,
    metadata: {
      pillar: input.pillar,
      metrics: input.metrics,
    },
  });
}

export async function logCentinelaIngestActivity(input: {
  recordId: string;
  summary: string;
  occurredAt: Date;
  modality: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await logActivity({
    occurredAt: input.occurredAt,
    category: "salud",
    action: "health_recorded",
    title: `Centinela → Nutrimetron: ${input.summary}`,
    summary: `Modalidad ${input.modality} procesada por agentes somáticos.`,
    agentId: "centinela-somatico",
    agentName: "Centinela Somático",
    sourceType: "health_ingest",
    sourceRef: `${input.recordId}:centinela`,
    metadata: input.metadata ?? {},
  });
}
