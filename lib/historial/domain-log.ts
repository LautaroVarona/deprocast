import "server-only";

import type { BackupManifest } from "@/lib/backup/manifest";
import { getCohereModelName } from "@/lib/cohere/config";
import { logActivity } from "@/lib/historial/log";
import type { ActivityCategory } from "@/lib/historial/types";
import type { ExportDomainId } from "@/lib/backup/domains";
import type { IngestInput, IngestResult } from "@/lib/kg/types";
import type { MemorySourceType } from "@/lib/mnemosyne/types";
import type { ParticulaValidada } from "@/lib/molecular-processing/types";
import type { CalibratorQueueConfig } from "@/lib/vibe-calibrator/types";

const MEMORY_CATEGORY_BY_SOURCE: Record<MemorySourceType, ActivityCategory> = {
  journal: "journal",
  notebook_page: "cuadernos",
  kg_mention: "kg",
  purifier_doc: "purifier",
  project: "meta",
};

export async function logNotebookProcessedActivity(input: {
  pageId: string;
  notebookId: string;
  notebookTitle: string;
  pageNumber: number;
  semanticPreview: string;
  corpusCaptureId?: string | null;
  quantaCount: number;
}): Promise<void> {
  await logActivity({
    category: "cuadernos",
    action: "notebook_processed",
    title: `${input.notebookTitle} · p.${input.pageNumber}`,
    summary: input.semanticPreview.slice(0, 200) || null,
    agentId: "vision-atomica",
    agentName: "Agente de Visión Atómica",
    modelUsed: getCohereModelName("vision"),
    sourceType: "notebook_page",
    sourceRef: input.pageId,
    correlationId: input.notebookId,
    metadata: {
      pageNumber: input.pageNumber,
      corpusCaptureId: input.corpusCaptureId ?? null,
      quantaCount: input.quantaCount,
    },
  });
}

export async function logMolecularValidatedActivity(
  particula: ParticulaValidada,
): Promise<void> {
  await logActivity({
    occurredAt: particula.validadaAt
      ? new Date(particula.validadaAt)
      : new Date(),
    category: "molecular",
    action: "molecular_validated",
    title: `Partícula: ${particula.textoFragmento.slice(0, 80)}`,
    summary: `${particula.ejeX} · Y${particula.ejeY} Z${particula.ejeZ} · ${particula.currencyPotencial}¤`,
    agentId: "calibrador-central",
    agentName: "Calibrador Central",
    sourceType: "molecular_particula",
    sourceRef: particula.id,
    metadata: {
      fuenteOrigen: particula.fuenteOrigen,
      ejeX: particula.ejeX,
      ejeY: particula.ejeY,
      ejeZ: particula.ejeZ,
      currencyPotencial: particula.currencyPotencial,
    },
  });
}

export async function logKgIngestedActivity(
  input: IngestInput,
  result: IngestResult,
): Promise<void> {
  const model =
    typeof input.source.metadata?.model === "string"
      ? input.source.metadata.model
      : null;

  await logActivity({
    category: "kg",
    action: "kg_ingested",
    title: `KG: ${input.source.type} · ${input.source.id}`,
    summary: `${result.nodeIds.length} nodos · ${result.edgeIds.length} aristas · ${result.mentionIds.length} menciones`,
    agentId: "motor-kg",
    agentName: "Motor de Extracción KG",
    modelUsed: model,
    sourceType: input.source.type,
    sourceRef: input.source.id,
    correlationId:
      (typeof input.source.metadata?.reviewId === "string"
        ? input.source.metadata.reviewId
        : null) ??
      (typeof input.source.metadata?.correlationId === "string"
        ? input.source.metadata.correlationId
        : null),
    metadata: {
      nodeCount: result.nodeIds.length,
      edgeCount: result.edgeIds.length,
      mentionCount: result.mentionIds.length,
    },
  });
}

export async function logMemoryIndexedActivity(input: {
  sourceType: MemorySourceType;
  sourceId: string;
  title: string;
  chunkCount: number;
  contentHash: string;
  embedModel: string;
}): Promise<void> {
  await logActivity({
    category: MEMORY_CATEGORY_BY_SOURCE[input.sourceType] ?? "meta",
    action: "indexed",
    title: `Indexado: ${input.title}`,
    summary: `${input.chunkCount} chunk${input.chunkCount === 1 ? "" : "s"}`,
    agentId: "mnemosyne",
    agentName: "Mnemosyne",
    modelUsed: input.embedModel,
    sourceType: input.sourceType,
    sourceRef: input.sourceId,
    metadata: {
      chunkCount: input.chunkCount,
      contentHash: input.contentHash,
    },
  });
}

export async function logVibeCalibratedActivity(input: {
  sessionId: string;
  config: CalibratorQueueConfig;
  voteCount: number;
  completedAt: Date;
}): Promise<void> {
  await logActivity({
    occurredAt: input.completedAt,
    category: "vibe",
    action: "vibe_calibrated",
    title: `Sesión calibrada · ${input.voteCount} voto${input.voteCount === 1 ? "" : "s"}`,
    summary: `Fuentes: ${input.config.sources.join(", ")}`,
    agentId: "calibrador",
    agentName: "Calibrador de Vibe",
    sourceType: "vibe_calibration_session",
    sourceRef: input.sessionId,
    metadata: {
      voteCount: input.voteCount,
      config: input.config,
    },
  });
}

export async function logEncyclopediaGeneratedActivity(input: {
  entryId: string;
  slug: string;
  title: string;
  bodyPreview: string;
  model: string | null;
  parentEntryId?: string | null;
  regenerated: boolean;
}): Promise<void> {
  await logActivity({
    category: "encyclopedia",
    action: "encyclopedia_generated",
    title: input.title,
    summary: input.bodyPreview.slice(0, 200),
    agentId: "enciclopediador",
    agentName: "Enciclopediador",
    modelUsed: input.model,
    sourceType: "encyclopedia_entry",
    sourceRef: input.entryId,
    metadata: {
      slug: input.slug,
      parentEntryId: input.parentEntryId ?? null,
      regenerated: input.regenerated,
    },
  });
}

export async function logBackupExportedActivity(
  manifest: BackupManifest,
): Promise<void> {
  await logActivity({
    occurredAt: new Date(manifest.createdAt),
    category: "backup",
    action: "backup_exported",
    title: `Export ${manifest.exportMode}: ${
      manifest.includedDomains?.join(", ") ?? "full"
    }`,
    summary: `${manifest.stats.totalBytes} bytes · ${manifest.stats.dataFileCount} archivos data · ${manifest.stats.uploadFileCount} uploads`,
    sourceType: "backup_manifest",
    sourceRef: manifest.createdAt,
    metadata: {
      exportMode: manifest.exportMode,
      includedDomains: manifest.includedDomains ?? null,
      stats: manifest.stats,
      appVersion: manifest.appVersion,
    },
  });
}

export async function logWatcherAnalyzedActivity(input: {
  sessionId: string;
  filename: string;
  durationSeconds: number;
  noteCount: number;
  durationMs: number;
}): Promise<void> {
  await logActivity({
    category: "watcher",
    action: "watcher_analyzed",
    title: `Watcher: ${input.filename}`,
    summary: `${input.noteCount} notas de conciencia · ${Math.round(input.durationSeconds)}s de video`,
    agentId: "cam-recorder-watcher",
    agentName: "Cam-Recorder-Watcher",
    modelUsed: "cohere-vision",
    sourceType: "watcher_session",
    sourceRef: input.sessionId,
    metadata: {
      filename: input.filename,
      durationSeconds: input.durationSeconds,
      noteCount: input.noteCount,
      durationMs: input.durationMs,
    },
  });
}

export async function logBackupImportedActivity(input: {
  restoredAt: string;
  exportMode: "full" | "partial";
  stats: BackupManifest["stats"];
  restoredDomains?: ExportDomainId[];
}): Promise<void> {
  await logActivity({
    occurredAt: new Date(input.restoredAt),
    category: "backup",
    action: "backup_imported",
    title: `Restore ${input.exportMode}`,
    summary: `${input.stats.totalBytes} bytes restaurados`,
    sourceType: "backup_restore",
    sourceRef: input.restoredAt,
    metadata: {
      restoredDomains: input.restoredDomains ?? null,
      stats: input.stats,
    },
  });
}
