import "server-only";

import type { PipelineStation } from "@/lib/audio-upload/constants";
import { extractMultiVectors } from "@/lib/agentes/multi-vector";
import { runQuantadorPipeline } from "@/lib/agentes/quantador";
import { resolveAudioAssetGravity } from "@/lib/audio-station/gravity";
import {
  buildOriginAttribution,
  selfActor,
  speakerActor,
} from "@/lib/ingesta/origin";
import { captureAndPurify } from "@/lib/purifier/capture";
import { getReviewQueueAssetIds } from "@/lib/purifier/review-store";
import { prisma } from "@/lib/prisma";
import { getUploadDir } from "@/lib/runtime-paths";
import { readFile } from "fs/promises";
import path from "path";

export type DistillPipelineResult =
  | { status: "skipped"; reason: string }
  | {
      status: "advanced";
      station: PipelineStation;
      reviewId?: string;
      quantomoIds?: string[];
    }
  | { status: "error"; message: string; station: PipelineStation };

async function setStation(
  assetId: string,
  station: PipelineStation,
  pipelineError: string | null = null,
): Promise<void> {
  await prisma.audioAsset.update({
    where: { id: assetId },
    data: {
      pipelineStation: station,
      pipelineError,
    },
  });
}

async function readAmbientContext(assetId: string): Promise<string> {
  try {
    const metaPath = path.join(getUploadDir(), `${assetId}.meta.json`);
    const raw = await readFile(metaPath, "utf8");
    const parsed = JSON.parse(raw) as { ambientContext?: string };
    return parsed.ambientContext?.trim() || "caminata";
  } catch {
    return "caminata";
  }
}

/**
 * Post-STT: LINEAGE → QUANT → VECTORS → HITL.
 * COAG se marca cuando HITL reconoce (markAssetCoagulated).
 */
export async function runDistillPipelineAfterStt(
  assetId: string,
): Promise<DistillPipelineResult> {
  try {
    return await runDistillPipelineAfterSttInner(assetId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "distill_failed";
    console.error(`Distill fatal for ${assetId}:`, error);
    // Schema ausente (P2021) u otros: no tumbar el request; marcar HITL degradado.
    try {
      await setStation(
        assetId,
        message.includes("does not exist") || message.includes("P2021")
          ? "HITL"
          : "ERROR",
        message.slice(0, 500),
      );
    } catch {
      /* ignore */
    }
    return { status: "error", message, station: "ERROR" };
  }
}

async function runDistillPipelineAfterSttInner(
  assetId: string,
): Promise<DistillPipelineResult> {
  const existingIds = await getReviewQueueAssetIds();
  if (existingIds.includes(assetId)) {
    await setStation(assetId, "HITL");
    return { status: "skipped", reason: "already_in_review" };
  }

  const asset = await prisma.audioAsset.findUnique({
    where: { id: assetId },
    include: { transcript: true },
  });

  if (!asset) {
    return { status: "skipped", reason: "asset_not_found" };
  }

  const rawText = asset.transcript?.rawText?.trim();
  if (!rawText) {
    await setStation(assetId, "ERROR", "no_transcript");
    return { status: "error", message: "Sin transcripción", station: "STT" };
  }

  const title = asset.filename.replace(/\.[^.]+$/, "");
  const ambientDefault = await readAmbientContext(assetId);

  try {
    // ── LINEAGE (+ Purifier interno; Quantador diferido) ─────
    await setStation(assetId, "LINEAGE");

    const { resolveTemporalLineage } = await import(
      "@/lib/ingesta/temporal-lineage"
    );
    const lineage = await resolveTemporalLineage({
      filename: asset.filename,
      originalCreatedAt: asset.originalCreatedAt,
      transcript: rawText,
      ambientDefault,
    });

    // Persistir desglose para HITL / tarjetas tácticas
    try {
      const { writeFile, mkdir } = await import("fs/promises");
      await mkdir(getUploadDir(), { recursive: true });
      await writeFile(
        path.join(getUploadDir(), `${assetId}.lineage.json`),
        JSON.stringify({
          fecha: lineage.fechaLabel,
          hora: lineage.horaLabel,
          lugar: lineage.lugar,
          ambientContext: lineage.ambientContext,
          indefinido: lineage.indefinido,
          source: lineage.source,
          confidence: lineage.confidence,
          rawHints: lineage.rawHints,
          timestampExacto: lineage.timestampExacto.toISOString(),
        }),
        "utf8",
      );
    } catch (error) {
      console.warn("Lineage sidecar write failed:", error);
    }

    await prisma.audioAsset.update({
      where: { id: assetId },
      data: { originalCreatedAt: lineage.timestampExacto },
    });

    const gravity = await resolveAudioAssetGravity(asset.id, asset.filename);
    let reviewId: string | undefined;
    let originAttributionId = asset.originAttributionId ?? undefined;

    try {
      const purify = await captureAndPurify(
        {
          channel: "audio",
          rawText,
          assetId: asset.id,
          filename: asset.filename,
          locationName: lineage.lugar ?? lineage.ambientContext,
          metadata: {
            estado: asset.status,
            transcritoEl: asset.transcript!.createdAt.toISOString(),
            autoPurify: "true",
            ambientContext: lineage.ambientContext,
            lineageSource: lineage.source,
            lineageIndefinido: lineage.indefinido ? "true" : "false",
            lineageFecha: lineage.fechaLabel,
            lineageHora: lineage.horaLabel,
          },
          gravity: {
            ...gravity,
            title: gravity.title ?? title,
          },
          origin: buildOriginAttribution({
            channel: "audio",
            actors: [selfActor(), speakerActor(title, asset.id)],
            capturedAt: lineage.timestampExacto.toISOString(),
            meta: {
              assetId: asset.id,
              filename: asset.filename,
              ambientContext: lineage.ambientContext,
              lineageSource: lineage.source,
              indefinido: lineage.indefinido,
              fecha: lineage.fechaLabel,
              hora: lineage.horaLabel,
              lugar: lineage.lugar,
            },
          }),
        },
        { extractKg: true, async: false, skipQuantador: true },
      );
      reviewId = purify.reviewId;
      originAttributionId = purify.originAttributionId;
    } catch (error) {
      console.error(`Distill purify failed for ${assetId}:`, error);
    }

    if (originAttributionId) {
      await prisma.originAttribution.update({
        where: { id: originAttributionId },
        data: {
          ambientContext: lineage.ambientContext,
          locationName: lineage.lugar ?? lineage.ambientContext,
          timestampExacto: lineage.timestampExacto,
        },
      });
      await prisma.audioAsset.update({
        where: { id: assetId },
        data: { originAttributionId },
      });
    } else {
      throw new Error("LINEAGE: no se pudo persistir OriginAttribution");
    }

    // ── QUANT ────────────────────────────────────────────────
    await setStation(assetId, "QUANT");

    const quant = await runQuantadorPipeline({
      rawText,
      originAttributionId,
      universoSlug: "babel",
      reviewId,
      assetId,
    });

    // ── VECTORS ──────────────────────────────────────────────
    await setStation(assetId, "VECTORS");

    await extractMultiVectors({
      rawText,
      quantomoIds: quant.quantomoIds,
      assetId,
      universoSlug: "babel",
    });

    // ── HITL ─────────────────────────────────────────────────
    await setStation(assetId, "HITL");

    return {
      status: "advanced",
      station: "HITL",
      reviewId,
      quantomoIds: quant.quantomoIds,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error en pipeline de destilación.";
    console.error(`Distill pipeline failed for ${assetId}:`, error);
    await setStation(assetId, "ERROR", message.slice(0, 500));
    return { status: "error", message, station: "ERROR" };
  }
}

export async function markAssetCoagulated(assetId: string): Promise<void> {
  const asset = await prisma.audioAsset.findUnique({
    where: { id: assetId },
    select: { id: true, pipelineStation: true },
  });
  if (!asset) return;
  if (asset.pipelineStation === "COAG") return;
  await setStation(assetId, "COAG");
}

export async function tryMarkCoagFromSourceRef(
  sourceRef: string | null | undefined,
): Promise<void> {
  if (!sourceRef?.trim()) return;
  const ref = sourceRef.trim();

  const byId = await prisma.audioAsset.findUnique({
    where: { id: ref },
    select: { id: true },
  });
  if (byId) {
    await markAssetCoagulated(byId.id);
    return;
  }

  const task = await prisma.pendingTask.findUnique({
    where: { id: ref },
    select: { sourceRef: true, reviewId: true },
  });
  if (task?.sourceRef) {
    const asset = await prisma.audioAsset.findUnique({
      where: { id: task.sourceRef },
      select: { id: true },
    });
    if (asset) {
      await markAssetCoagulated(asset.id);
      return;
    }
  }

  const candidate = await prisma.entityCandidate.findFirst({
    where: { OR: [{ id: ref }, { sourceId: ref }] },
    select: { sourceId: true },
  });
  if (candidate?.sourceId) {
    await markAssetCoagulated(candidate.sourceId);
  }
}
