import "server-only";

import type { SourceType } from "@/lib/document-constants";
import {
  assertOriginAttribution,
  buildOriginAttribution,
  mapIngestaChannelToOrigin,
  originToJson,
  selfActor,
  type OriginAttribution,
} from "@/lib/ingesta/origin";
import {
  MATERIA_ESTADO_PENDIENTE_PURIFICACION,
  MATERIA_ESTADO_PRIMA_MATERIA,
  type IngestaChannel,
} from "@/lib/purifier/constants";
import { runPurificationPipeline } from "@/lib/purifier/engine";
import type { GravityInput, PurifierReviewRecord } from "@/lib/purifier/types";
import {
  DEFAULT_CAMPO_SLUG,
  getCampoLabel,
  resolveCampoSlug,
  type CampoSlug,
} from "@/lib/projects/campos";
import { resolveContextSeal } from "@/lib/babel/context-seal";
import { registerBabelRecord } from "@/lib/babel/record-store";
import { getRawDocumentsPath } from "@/lib/runtime-paths";
import { sanitizeHiddenChars } from "@/lib/utils/text-sanitizer";
import {
  saveReviewRecord,
  updateReviewPipelineStatus,
} from "@/lib/purifier/review-store";
import { normalizeOnda } from "@/lib/purifier/hitl-metadata";
import { EMPTY_STRICT_META_TAGS } from "@/lib/purifier/meta-tags-taxonomy";
import { randomUUID } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const PENDING_PURIFICATION_DIR = getRawDocumentsPath(
  "pending_purification",
);

export type { IngestaChannel } from "@/lib/purifier/constants";
export {
  CAPTURE_SUCCESS_TOAST,
  CAPTURE_QUEUED_TOAST,
  MATERIA_ESTADO_PENDING_PURIFICATION,
  MATERIA_ESTADO_PRIMA_MATERIA,
  MATERIA_ESTADO_PENDIENTE_PURIFICACION,
  MATERIA_ESTADO_PENDIENTE_VALIDACION,
  MATERIA_ESTADO_MOLECULARIZADO,
} from "@/lib/purifier/constants";

export type CaptureGravity = {
  title?: string;
  campoSlug?: CampoSlug;
  universeSlug?: string;
  onda?: string;
  sourceType?: SourceType;
  locationName?: string;
};

export type CaptureInput = {
  channel: IngestaChannel;
  rawText: string;
  filename?: string;
  assetId?: string;
  metadata?: Record<string, string | null>;
  gravity?: CaptureGravity;
  /** Linaje de origen; si falta se infiere del canal con actor self. */
  origin?: OriginAttribution;
  /** Entorno físico opcional (HITL fricción cero). */
  locationName?: string | null;
  /** GeoLocation id para resolver nombre automáticamente. */
  geoLocationId?: string | null;
  /** FK persistida tras captura (inyectada internamente). */
  originAttributionId?: string;
};

export type CaptureOptions = {
  extractKg?: boolean;
  /**
   * Si true, crea el stub en `pendiente_purificacion` y corre el pipeline
   * en background (fire-and-forget). Por defecto true para evitar timeouts.
   */
  async?: boolean;
};

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function sanitizeSlug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "sin-titulo"
  );
}

export async function savePendingPurification(
  input: CaptureInput & { captureId?: string; estado?: string },
): Promise<{ captureId: string; filename: string }> {
  await mkdir(PENDING_PURIFICATION_DIR, { recursive: true });

  const captureId = input.captureId ?? randomUUID();
  const createdAt = new Date();
  const displayTitle =
    input.gravity?.title?.trim() ||
    input.filename?.replace(/\.[^.]+$/, "") ||
    "Sin título";
  const timestamp = Math.floor(createdAt.getTime() / 1000);
  const baseName = `${timestamp}_${sanitizeSlug(displayTitle)}`;

  let filename = `${baseName}.md`;
  let suffix = 1;
  while (await fileExists(path.join(PENDING_PURIFICATION_DIR, filename))) {
    filename = `${baseName}-${suffix}.md`;
    suffix += 1;
  }

  const resolvedField = resolveCampoSlug(input.gravity?.campoSlug);
  const contextSeal = resolveContextSeal({
    universeSlug: input.gravity?.universeSlug,
  });
  const campoLabel = getCampoLabel(resolvedField);
  const sourceType = input.gravity?.sourceType ?? "ai_chat";
  const onda = normalizeOnda(input.gravity?.onda);
  const estado = input.estado ?? MATERIA_ESTADO_PENDIENTE_PURIFICACION;

  const frontmatter = [
    "---",
    `capture_id: "${captureId}"`,
    `channel: "${input.channel}"`,
    `title: ${JSON.stringify(displayTitle)}`,
    `campo: ${JSON.stringify(campoLabel)}`,
    `estado: "${estado}"`,
    `source_type: "${sourceType}"`,
    `field: "${resolvedField}"`,
    `context_seal: "${contextSeal}"`,
    `universe: "${contextSeal}"`,
    `onda: "${onda}"`,
    `created_at: "${createdAt.toISOString()}"`,
    ...(input.filename ? [`original_filename: ${JSON.stringify(input.filename)}`] : []),
    ...(input.assetId ? [`asset_id: "${input.assetId}"`] : []),
    "---",
  ].join("\n");

  await writeFile(
    path.join(PENDING_PURIFICATION_DIR, filename),
    `${frontmatter}\n${input.rawText.trim()}\n`,
    "utf-8",
  );

  return { captureId, filename };
}

function toGravityInput(gravity?: CaptureGravity): GravityInput | undefined {
  if (!gravity) return undefined;

  return {
    title: gravity.title,
    campoSlug: gravity.campoSlug,
    universeSlug: gravity.universeSlug,
    onda: normalizeOnda(gravity.onda),
    sourceType: gravity.sourceType,
  };
}

function buildStubReview(input: {
  reviewId: string;
  captureId: string;
  rawText: string;
  filename: string;
  assetId?: string;
  metadata: Record<string, string | null>;
  gravity?: CaptureGravity;
}): PurifierReviewRecord {
  const gravityInput = toGravityInput(input.gravity);
  const campoSlug = resolveCampoSlug(gravityInput?.campoSlug);
  const title =
    gravityInput?.title?.trim() ||
    input.filename.replace(/\.[^.]+$/, "") ||
    "Sin título";
  const onda = normalizeOnda(gravityInput?.onda);
  const now = new Date().toISOString();

  return {
    schemaVersion: "2",
    reviewId: input.reviewId,
    pipelineStatus: "pendiente_purificacion",
    particula: `pending-${input.captureId.slice(0, 8)}`,
    assetId: input.assetId,
    captureId: input.captureId,
    gravity: {
      title,
      campoSlug,
      universeSlug: gravityInput?.universeSlug,
      onda,
      sourceType: gravityInput?.sourceType ?? "ai_chat",
      prioridad: 6,
      impacto: 6,
      dificultad: 6,
    },
    source: {
      filename: input.filename,
      metadata: input.metadata,
    },
    originalText: input.rawText,
    stages: [],
    afterRegex: input.rawText,
    cleanedText: input.rawText,
    metaTagsSecundarios: Object.values(EMPTY_STRICT_META_TAGS),
    strictMetaTags: { ...EMPTY_STRICT_META_TAGS },
    doubts: [],
    suggestedDimensions: {
      materia: "texto",
      particula: `pending-${input.captureId.slice(0, 8)}`,
      posicion: "observador",
      onda,
      tiempo: now.slice(0, 10),
      espacio: "ingesta-web",
      field: campoSlug || DEFAULT_CAMPO_SLUG,
      title,
      prioridad: 6,
      impacto: 6,
      dificultad: 6,
    },
    normalizedMarkdown: "",
    fractalSegments: [],
    dedup: { mergedCount: 0, threshold: 0.82 },
    regex: { removedCount: 0 },
    processedAt: now,
    model: "pending",
  };
}

async function runSideEffects(input: {
  trimmed: string;
  channel: IngestaChannel;
  reviewId: string;
  captureId: string;
  filename: string;
  assetId?: string;
  originAttributionId: string;
  contextSeal: string;
  resolvedField: CampoSlug;
  title: string;
  record: PurifierReviewRecord;
}) {
  void registerBabelRecord({
    kind: "capture",
    physicalRef: input.reviewId,
    contentPreview: input.trimmed,
    occurredAt: new Date(),
    contextSeal: input.contextSeal,
    campoSlug: input.resolvedField,
    channel: input.channel,
    metadata: {
      captureId: input.captureId,
      pendingFilename: input.filename,
      assetId: input.assetId ?? null,
      pipelineStatus: input.record.pipelineStatus,
    },
  }).catch((error) => {
    console.error("Babel record hook error:", error);
  });

  void import("@/lib/trailing-commands/process").then(
    ({ processTrailingCommands }) =>
      processTrailingCommands({
        rawText: input.trimmed,
        source: input.channel,
        sourceRef: input.reviewId,
        reviewId: input.reviewId,
        assetId: input.assetId,
        occurredAt: new Date(),
        universeSlug: input.contextSeal,
      }).catch((error) => {
        console.error("Trailing commands hook error:", error);
      }),
  );

  void import("@/lib/historial/pipeline-log").then(({ logCaptureActivity }) => {
    void logCaptureActivity({
      channel: input.channel,
      reviewId: input.reviewId,
      title: input.title,
      captureId: input.captureId,
      assetId: input.assetId,
    }).catch((error) => {
      console.error("Historial capture log error:", error);
    });
  });

  void import("@/lib/agentes/quantador").then(({ enqueueQuantadorPipeline }) =>
    enqueueQuantadorPipeline({
      rawText: input.trimmed,
      originAttributionId: input.originAttributionId,
      universoSlug: input.contextSeal,
      reviewId: input.reviewId,
    }),
  );
}

async function purifyCaptureStub(input: {
  reviewId: string;
  captureId: string;
  trimmed: string;
  assetId?: string;
  filename: string;
  metadata: Record<string, string | null>;
  gravity?: CaptureGravity;
  extractKg: boolean;
}): Promise<PurifierReviewRecord> {
  try {
    const record = await runPurificationPipeline(
      {
        rawText: input.trimmed,
        assetId: input.assetId,
        filename: input.filename,
        metadata: input.metadata,
        gravity: toGravityInput(input.gravity),
      },
      {
        extractKg: input.extractKg,
        reviewId: input.reviewId,
        captureId: input.captureId,
        pipelineStatus: "pendiente_purificacion",
        saveReview: true,
      },
    );
    return record;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error en purificación";
    console.error("Purification background error:", error);

    const loaded = await import("@/lib/purifier/review-store").then(
      ({ loadReviewRecord }) => loadReviewRecord(input.reviewId),
    );
    if (loaded) {
      await saveReviewRecord({
        ...loaded.record,
        purificationError: message,
        processedAt: new Date().toISOString(),
      });
    }
    throw error;
  }
}

/**
 * Captura prima materia y la hace transitar por el pipeline:
 * prima_materia → pendiente_purificacion → pendiente_validacion.
 *
 * Por defecto corre la purificación en background para que la UI no
 * dependa del timeout del request HTTP.
 */
export async function captureAndPurify(
  input: CaptureInput,
  options?: CaptureOptions,
) {
  const trimmed = sanitizeHiddenChars(input.rawText);
  if (!trimmed) {
    throw new Error("La prima materia no puede estar vacía.");
  }

  const originChannel =
    mapIngestaChannelToOrigin(input.channel) ??
    (input.channel === "tablas" ? "texto" : null);

  const origin =
    input.origin ??
    buildOriginAttribution({
      channel: originChannel ?? "texto",
      actors: [selfActor()],
      meta: { ingestaChannel: input.channel },
    });
  assertOriginAttribution(origin);

  const { persistOriginAttribution, resolveLocationNameFromGeo } = await import(
    "@/lib/ingesta/origin-store"
  );

  const resolvedLocation =
    input.locationName?.trim() ||
    (await resolveLocationNameFromGeo(input.geoLocationId)) ||
    null;

  const { id: originAttributionId } = await persistOriginAttribution({
    origin,
    locationName: resolvedLocation,
    geoLocationId: input.geoLocationId,
  });

  const reviewId = randomUUID();
  const captureId = randomUUID();

  // Estado 1→2: persiste prima materia y deja el MD en pendiente_purificacion
  const { filename } = await savePendingPurification({
    ...input,
    rawText: trimmed,
    captureId,
    originAttributionId,
    estado: MATERIA_ESTADO_PENDIENTE_PURIFICACION,
  });

  const contextSeal = resolveContextSeal({
    universeSlug: input.gravity?.universeSlug,
  });
  const resolvedField = resolveCampoSlug(input.gravity?.campoSlug);
  const metadata: Record<string, string | null> = {
    ...input.metadata,
    channel: input.channel,
    captureId,
    pendingPurificationFile: filename,
    created_at: new Date().toISOString(),
    origin: JSON.stringify(originToJson(origin)),
    originAttributionId,
    locationName: resolvedLocation,
    pipelineStatus: MATERIA_ESTADO_PENDIENTE_PURIFICACION,
    priorEstado: MATERIA_ESTADO_PRIMA_MATERIA,
  };

  // Stub en DB: prima_materia → pendiente_purificacion (aún no aparece en Aduana)
  const stub = buildStubReview({
    reviewId,
    captureId,
    rawText: trimmed,
    filename: input.filename ?? filename,
    assetId: input.assetId,
    metadata,
    gravity: input.gravity,
  });
  stub.pipelineStatus = "prima_materia";
  await saveReviewRecord(stub);
  await updateReviewPipelineStatus(reviewId, "pendiente_purificacion");

  const runPurify = async () => {
    const record = await purifyCaptureStub({
      reviewId,
      captureId,
      trimmed,
      assetId: input.assetId,
      filename: input.filename ?? filename,
      metadata,
      gravity: input.gravity,
      extractKg: options?.extractKg !== false,
    });

    await runSideEffects({
      trimmed,
      channel: input.channel,
      reviewId,
      captureId,
      filename,
      assetId: input.assetId,
      originAttributionId,
      contextSeal,
      resolvedField,
      title:
        record.suggestedDimensions?.title ??
        input.gravity?.title ??
        filename,
      record,
    });

    return record;
  };

  const asyncMode = options?.async !== false;

  if (asyncMode) {
    void runPurify().catch((error) => {
      console.error("Async capture purify failed:", error);
    });

    return {
      captureId,
      pendingFilename: filename,
      reviewId,
      particula: stub.particula,
      originAttributionId,
      pipelineStatus: "pendiente_purificacion" as const,
      queued: true,
    };
  }

  const record = await runPurify();

  return {
    captureId,
    pendingFilename: filename,
    reviewId: record.reviewId,
    particula: record.particula,
    originAttributionId,
    pipelineStatus: record.pipelineStatus,
    queued: false,
  };
}

/** Fuerza transición a molecularizado tras approve (vectorización). */
export async function markReviewMolecularizado(
  reviewId: string,
): Promise<PurifierReviewRecord | null> {
  return updateReviewPipelineStatus(reviewId, "molecularizado");
}
