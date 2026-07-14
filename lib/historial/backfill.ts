import "server-only";

import type { PurifierReviewRecord } from "@/lib/purifier/types";
import {
  CHANNEL_AGENT,
  buildPurifierStageAgents,
} from "@/lib/historial/pipeline-log";
import { logActivity } from "@/lib/historial/log";
import { ORCHESTRATOR_AGENT } from "@/lib/historial/agent-map";
import type { IngestaChannel } from "@/lib/purifier/constants";
import { prisma } from "@/lib/prisma";

export async function backfillActivityLog(): Promise<{
  created: number;
  skipped: number;
}> {
  let created = 0;
  let skipped = 0;

  const countBefore = await prisma.activityLog.count();

  const babelRecords = await prisma.babelRecord.findMany({
    orderBy: { occurredAt: "desc" },
    take: 2000,
  });

  for (const record of babelRecords) {
    const channel = (record.channel ?? "texto") as IngestaChannel;
    const agent = CHANNEL_AGENT[channel] ?? ORCHESTRATOR_AGENT;
    const id = await logActivity({
      occurredAt: record.occurredAt,
      category: "ingesta",
      action: "captured",
      title: `Captura ${record.kind}: ${record.physicalRef.slice(0, 60)}`,
      summary: record.contentPreview.slice(0, 200) || undefined,
      agentId: agent.agentId,
      agentName: agent.agentName,
      sourceType: "babel_record",
      sourceRef: record.id,
      correlationId: record.physicalRef,
      metadata: {
        kind: record.kind,
        channel: record.channel,
        contextSeal: record.contextSeal,
      },
    });
    if (id) created++;
    else skipped++;
  }

  const purifierReviews = await prisma.purifierReview.findMany({
    orderBy: { processedAt: "desc" },
    take: 2000,
  });

  for (const row of purifierReviews) {
    const payload = row.payload as unknown as PurifierReviewRecord;
    const id = await logActivity({
      occurredAt: row.processedAt,
      category: "purifier",
      action: "purified",
      title: `Purificación: ${row.title}`,
      summary: row.particula,
      agentId: ORCHESTRATOR_AGENT.agentId,
      agentName: ORCHESTRATOR_AGENT.agentName,
      modelUsed: payload.model ?? undefined,
      sourceType: "purifier_review",
      sourceRef: row.reviewId,
      correlationId: row.reviewId,
      metadata: {
        particula: row.particula,
        assetId: row.assetId,
        stageAgents: payload.stages
          ? buildPurifierStageAgents(
              payload.stages,
              Boolean(payload.kgExtraction || payload.kgIngest),
            )
          : [],
      },
    });
    if (id) created++;
    else skipped++;
  }

  const audioAssets = await prisma.audioAsset.findMany({
    where: { status: "COMPLETED" },
    include: { transcript: true },
    orderBy: { updatedAt: "desc" },
    take: 2000,
  });

  for (const asset of audioAssets) {
    const id = await logActivity({
      occurredAt: asset.updatedAt,
      category: "audio",
      action: "transcribed",
      title: `Transcripción: ${asset.filename}`,
      summary: asset.transcript
        ? `${asset.transcript.rawText.slice(0, 120)}…`
        : undefined,
      agentId: "stt",
      modelUsed: "deepgram",
      sourceType: "audio_asset",
      sourceRef: asset.id,
      correlationId: asset.id,
      metadata: {
        filename: asset.filename,
        confidence: asset.transcript?.confidence ?? null,
      },
    });
    if (id) created++;
    else skipped++;
  }

  const contextEvents = await prisma.contextEvent.findMany({
    orderBy: { occurredAt: "desc" },
    take: 2000,
  });

  for (const event of contextEvents) {
    const agentId =
      event.source === "journal"
        ? "extractor-eventos"
        : event.source === "audio"
          ? "extractor-trailing"
          : "extractor-eventos";

    const id = await logActivity({
      occurredAt: event.occurredAt,
      category: "events",
      action: "extracted_events",
      title: event.content.slice(0, 120),
      summary: `Pilar: ${event.pillar} · ${event.status}`,
      agentId,
      sourceType: "context_event",
      sourceRef: event.id,
      correlationId: event.correlationId ?? undefined,
      metadata: {
        pillar: event.pillar,
        status: event.status,
        source: event.source,
        sourceRef: event.sourceRef,
      },
    });
    if (id) created++;
    else skipped++;
  }

  const documentMetas = await prisma.documentMeta.findMany({
    orderBy: { processedAt: "desc" },
    take: 2000,
  });

  for (const meta of documentMetas) {
    const id = await logActivity({
      occurredAt: meta.processedAt,
      category: "meta",
      action: "meta_processed",
      title: `Meta-Meteador: ${meta.titulo}`,
      summary: meta.particula,
      agentId: "meta-meteador",
      modelUsed: meta.modelUsed ?? undefined,
      sourceType: "document_meta",
      sourceRef: meta.documentId,
      metadata: { materia: meta.materia, campo: meta.campo },
    });
    if (id) created++;
    else skipped++;
  }

  const chatMessages = await prisma.chatMessage.findMany({
    where: { role: "assistant" },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  for (const message of chatMessages) {
    const id = await logActivity({
      occurredAt: message.createdAt,
      category: "chat",
      action: "chat_turn",
      title: `Chat: ${message.content.slice(0, 80)}`,
      summary: message.content.slice(0, 200),
      agentId: "exocortex",
      modelUsed: message.model ?? undefined,
      sourceType: "chat_message",
      sourceRef: message.id,
      correlationId: message.sessionId,
      metadata: { sessionId: message.sessionId, role: message.role },
    });
    if (id) created++;
    else skipped++;
  }

  const pendingTasks = await prisma.pendingTask.findMany({
    orderBy: { recognizedAt: "desc" },
    take: 1000,
  });

  for (const task of pendingTasks) {
    const agentId =
      task.source === "journal" ? "listador" : "extractor-trailing";
    const id = await logActivity({
      occurredAt: task.recognizedAt,
      category: "events",
      action: "extracted_tasks",
      title: `Tarea: ${task.title}`,
      summary: task.description?.slice(0, 120) ?? undefined,
      agentId,
      sourceType: "pending_task",
      sourceRef: task.id,
      correlationId: task.reviewId ?? undefined,
      metadata: {
        source: task.source,
        status: task.status,
        targetDay: task.targetDay,
      },
    });
    if (id) created++;
    else skipped++;
  }

  const createdNet = (await prisma.activityLog.count()) - countBefore;

  return { created: createdNet, skipped };
}

const HEALTH_AGENT_BY_PILLAR: Record<
  string,
  { agentId: string; agentName: string; label: string }
> = {
  combustible: { agentId: "nutrimetron", agentName: "Nutrimetron", label: "Combustible" },
  rendimiento: { agentId: "kinetometro", agentName: "Kinetómetro", label: "Rendimiento" },
  recuperacion: { agentId: "somatometron", agentName: "Somatometrón", label: "Recuperación" },
  estado_base: { agentId: "ambientografo", agentName: "Ambientógrafo", label: "Estado base" },
};

export async function backfillHealthRecords(options?: {
  limit?: number;
}): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  const records = await prisma.healthRecord.findMany({
    orderBy: { occurredAt: "desc" },
    take: options?.limit ?? 500,
  });

  for (const record of records) {
    const existing = await prisma.activityLog.findUnique({
      where: {
        sourceType_sourceRef_action: {
          sourceType: "health_record",
          sourceRef: record.id,
          action: "health_recorded",
        },
      },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const agent = HEALTH_AGENT_BY_PILLAR[record.pillar] ?? {
      agentId: "nutrimetron",
      agentName: "Nutrimetron",
      label: record.pillar,
    };

    const metrics =
      record.metrics && typeof record.metrics === "object"
        ? (record.metrics as Record<string, unknown>)
        : {};

    const id = await logActivity({
      occurredAt: record.occurredAt,
      category: "salud",
      action: "health_recorded",
      title: `${agent.label}: ${record.summary}`,
      summary: record.summary,
      agentId: agent.agentId,
      agentName: agent.agentName,
      sourceType: "health_record",
      sourceRef: record.id,
      metadata: {
        pillar: record.pillar,
        metrics,
        backfill: true,
      },
    });

    if (id) created++;
    else skipped++;
  }

  return { created, skipped };
}
