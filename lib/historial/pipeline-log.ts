import "server-only";

import type { PurifierReviewRecord } from "@/lib/purifier/types";
import {
  getAgentForPurifierStation,
  ORCHESTRATOR_AGENT,
  PURIFIER_KG_AGENT,
} from "@/lib/historial/agent-map";
import { logActivity } from "@/lib/historial/log";
import type { IngestaChannel } from "@/lib/purifier/constants";

export const CHANNEL_AGENT: Record<
  IngestaChannel,
  { agentId: string; agentName: string }
> = {
  texto: { agentId: "orquestador", agentName: "Orquestador Purifier" },
  audio: { agentId: "stt", agentName: "Motor de Transcripción STT" },
  tablas: { agentId: "orquestador", agentName: "Orquestador Purifier" },
  vision: { agentId: "vision", agentName: "Agente de Visión OCR" },
  "x-bookmarks": { agentId: "orquestador", agentName: "Orquestador Purifier" },
};

export function buildPurifierStageAgents(
  stages: PurifierReviewRecord["stages"],
  hasKg?: boolean,
): Array<{ station: number; name: string; agentId: string; agentName: string }> {
  const mapped = stages.map((stage) => {
    const agent = getAgentForPurifierStation(stage.station);
    return {
      station: stage.station,
      name: stage.name,
      agentId: agent.agentId,
      agentName: agent.agentName,
    };
  });

  if (hasKg) {
    mapped.push({
      station: 4.1,
      name: "Extracción KG",
      agentId: PURIFIER_KG_AGENT.agentId,
      agentName: PURIFIER_KG_AGENT.agentName,
    });
  }

  return mapped;
}

export async function logCaptureActivity(input: {
  channel: IngestaChannel;
  reviewId: string;
  title: string;
  captureId?: string;
  assetId?: string;
  occurredAt?: Date;
}): Promise<void> {
  const agent = CHANNEL_AGENT[input.channel] ?? ORCHESTRATOR_AGENT;

  await logActivity({
    occurredAt: input.occurredAt,
    category: "ingesta",
    action: "captured",
    title: input.title,
    summary: `Captura vía canal ${input.channel}`,
    agentId: agent.agentId,
    agentName: agent.agentName,
    sourceType: "babel_record",
    sourceRef: input.reviewId,
    correlationId: input.reviewId,
    metadata: {
      channel: input.channel,
      captureId: input.captureId ?? null,
      assetId: input.assetId ?? null,
    },
  });
}

export async function logPurifiedActivity(
  record: PurifierReviewRecord,
): Promise<void> {
  const title =
    record.suggestedDimensions?.title ??
    record.source.filename ??
    record.particula;

  await logActivity({
    occurredAt: new Date(record.processedAt),
    category: "purifier",
    action: "purified",
    title: `Purificación: ${title}`,
    summary: `${record.stages.length} estaciones · ${record.particula}`,
    agentId: ORCHESTRATOR_AGENT.agentId,
    agentName: ORCHESTRATOR_AGENT.agentName,
    modelUsed: record.model,
    sourceType: "purifier_review",
    sourceRef: record.reviewId,
    correlationId: record.reviewId,
    metadata: {
      particula: record.particula,
      assetId: record.assetId ?? null,
      filename: record.source.filename,
      stageAgents: buildPurifierStageAgents(
        record.stages,
        Boolean(record.kgExtraction || record.kgIngest),
      ),
      stages: record.stages.map((s) => ({
        station: s.station,
        name: s.name,
        agentId: getAgentForPurifierStation(s.station).agentId,
      })),
    },
  });
}

export async function logApprovedActivity(input: {
  reviewId: string;
  title: string;
}): Promise<void> {
  await logActivity({
    category: "validation",
    action: "approved",
    title: `Aprobado: ${input.title}`,
    agentId: ORCHESTRATOR_AGENT.agentId,
    agentName: ORCHESTRATOR_AGENT.agentName,
    sourceType: "purifier_review",
    sourceRef: input.reviewId,
    correlationId: input.reviewId,
  });
}

export async function logRejectedActivity(input: {
  reviewId: string;
  title?: string;
}): Promise<void> {
  await logActivity({
    category: "validation",
    action: "rejected",
    title: `Rechazado: ${input.title ?? input.reviewId}`,
    agentId: ORCHESTRATOR_AGENT.agentId,
    agentName: ORCHESTRATOR_AGENT.agentName,
    sourceType: "purifier_review",
    sourceRef: `${input.reviewId}:rejected`,
    correlationId: input.reviewId,
  });
}
