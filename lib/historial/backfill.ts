import "server-only";

import type { PurifierReviewRecord } from "@/lib/purifier/types";
import {
  CHANNEL_AGENT,
  buildPurifierStageAgents,
} from "@/lib/historial/pipeline-log";
import { logActivity } from "@/lib/historial/log";
import { ORCHESTRATOR_AGENT } from "@/lib/historial/agent-map";
import { getCohereModelName } from "@/lib/cohere/config";
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
      summary: record.contentPreview.slice(0, 200) || null,
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
      modelUsed: payload.model,
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
        : null,
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
      correlationId: event.correlationId,
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
      modelUsed: meta.modelUsed,
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
      modelUsed: message.model,
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
      occurredAt: task.recognizedAt ?? task.createdAt,
      category: "events",
      action: "extracted_tasks",
      title: `Tarea: ${task.title}`,
      summary: task.description?.slice(0, 120) ?? null,
      agentId,
      sourceType: "pending_task",
      sourceRef: task.id,
      correlationId: task.reviewId,
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

async function trackLog(
  id: string | null,
  counters: { created: number; skipped: number },
): Promise<void> {
  if (id) counters.created++;
  else counters.skipped++;
}

/** Backfill idempotente de fuentes que antes no registraban ActivityLog. */
export async function backfillExtendedActivitySources(options?: {
  limit?: number;
}): Promise<{ created: number; skipped: number }> {
  const counters = { created: 0, skipped: 0 };
  const limit = options?.limit ?? 500;

  const notebookPages = await prisma.notebookPage.findMany({
    where: { status: "COMPLETED" },
    include: { notebook: { select: { title: true } } },
    orderBy: { processedAt: "desc" },
    take: limit,
  });

  for (const page of notebookPages) {
    const id = await logActivity({
      occurredAt: page.processedAt ?? page.updatedAt,
      category: "cuadernos",
      action: "notebook_processed",
      title: `${page.notebook.title} · p.${page.pageNumber}`,
      summary: page.semanticVector?.slice(0, 200) ?? null,
      agentId: "vision-atomica",
      agentName: "Agente de Visión Atómica",
      modelUsed: getCohereModelName("vision"),
      sourceType: "notebook_page",
      sourceRef: page.id,
      correlationId: page.notebookId,
      metadata: {
        pageNumber: page.pageNumber,
        corpusCaptureId: page.corpusCaptureId,
        backfill: true,
      },
    });
    await trackLog(id, counters);
  }

  const vibeSessions = await prisma.vibeCalibrationSession.findMany({
    where: { completedAt: { not: null } },
    include: { votes: true },
    orderBy: { completedAt: "desc" },
    take: limit,
  });

  for (const session of vibeSessions) {
    const config = session.config as { sources?: string[] };
    const id = await logActivity({
      occurredAt: session.completedAt ?? session.startedAt,
      category: "vibe",
      action: "vibe_calibrated",
      title: `Sesión calibrada · ${session.votes.length} votos`,
      summary: `Fuentes: ${(config.sources ?? []).join(", ") || "—"}`,
      agentId: "calibrador",
      agentName: "Calibrador de Vibe",
      sourceType: "vibe_calibration_session",
      sourceRef: session.id,
      metadata: { voteCount: session.votes.length, backfill: true },
    });
    await trackLog(id, counters);
  }

  const encyclopediaEntries = await prisma.encyclopediaEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  for (const entry of encyclopediaEntries) {
    const id = await logActivity({
      occurredAt: entry.createdAt,
      category: "encyclopedia",
      action: "encyclopedia_generated",
      title: entry.title,
      summary: entry.body.slice(0, 200),
      agentId: "enciclopediador",
      agentName: "Enciclopediador",
      modelUsed: entry.model,
      sourceType: "encyclopedia_entry",
      sourceRef: entry.id,
      metadata: { slug: entry.slug, backfill: true },
    });
    await trackLog(id, counters);
  }

  const memoryGroups = await prisma.memoryEmbedding.groupBy({
    by: ["sourceType", "sourceId"],
    _max: { createdAt: true, embedModel: true, title: true },
    _count: { id: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: limit,
  });

  for (const group of memoryGroups) {
    const category =
      group.sourceType === "notebook_page"
        ? "cuadernos"
        : group.sourceType === "journal"
          ? "journal"
          : group.sourceType === "kg_mention"
            ? "kg"
            : group.sourceType === "purifier_doc"
              ? "purifier"
              : "meta";

    const id = await logActivity({
      occurredAt: group._max.createdAt ?? new Date(),
      category,
      action: "indexed",
      title: `Indexado: ${group._max.title ?? group.sourceId}`,
      summary: `${group._count.id} chunk${group._count.id === 1 ? "" : "s"}`,
      agentId: "mnemosyne",
      agentName: "Mnemosyne",
      modelUsed: group._max.embedModel,
      sourceType: group.sourceType,
      sourceRef: group.sourceId,
      metadata: { chunkCount: group._count.id, backfill: true },
    });
    await trackLog(id, counters);
  }

  try {
    const { listValidatedParticulas } = await import(
      "@/lib/molecular-processing/store"
    );
    const particulas = (await listValidatedParticulas()).slice(0, limit);

    for (const particula of particulas) {
      const id = await logActivity({
        occurredAt: particula.validadaAt
          ? new Date(particula.validadaAt)
          : new Date(),
        category: "molecular",
        action: "molecular_validated",
        title: `Partícula: ${particula.textoFragmento.slice(0, 80)}`,
        summary: `${particula.ejeX} · Y${particula.ejeY} Z${particula.ejeZ}`,
        agentId: "calibrador-central",
        agentName: "Calibrador Central",
        sourceType: "molecular_particula",
        sourceRef: particula.id,
        metadata: { backfill: true },
      });
      await trackLog(id, counters);
    }
  } catch {
    // store de molecular puede no existir aún
  }

  const kgSources = await prisma.kgSource.findMany({
    orderBy: { lastIngestedAt: "desc" },
    take: limit,
  });

  for (const source of kgSources) {
    const metadata =
      source.metadata && typeof source.metadata === "object"
        ? (source.metadata as Record<string, unknown>)
        : {};

    const id = await logActivity({
      occurredAt: source.lastIngestedAt,
      category: "kg",
      action: "kg_ingested",
      title: `KG: ${source.sourceType} · ${source.sourceId}`,
      summary: `${source.nodeCount} nodos · ${source.edgeCount} aristas`,
      agentId: "motor-kg",
      agentName: "Motor de Extracción KG",
      modelUsed:
        typeof metadata.model === "string" ? metadata.model : null,
      sourceType: source.sourceType,
      sourceRef: source.sourceId,
      metadata: {
        nodeCount: source.nodeCount,
        edgeCount: source.edgeCount,
        mentionCount: source.mentionCount,
        backfill: true,
      },
    });
    await trackLog(id, counters);
  }

  return counters;
}
