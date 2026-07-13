import "server-only";

import type { SourceType } from "@/lib/document-constants";
import {
  MATERIA_ESTADO_PENDING_PURIFICATION,
  type IngestaChannel,
} from "@/lib/purifier/constants";
import { runPurificationPipeline } from "@/lib/purifier/engine";
import type { GravityInput } from "@/lib/purifier/types";
import {
  getCampoLabel,
  resolveCampoSlug,
  type CampoSlug,
} from "@/lib/projects/campos";
import { resolveContextSeal } from "@/lib/babel/context-seal";
import { registerBabelRecord } from "@/lib/babel/record-store";
import { getRawDocumentsPath } from "@/lib/runtime-paths";
import { randomUUID } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const PENDING_PURIFICATION_DIR = getRawDocumentsPath(
  "pending_purification",
);

export type { IngestaChannel } from "@/lib/purifier/constants";
export {
  CAPTURE_SUCCESS_TOAST,
  MATERIA_ESTADO_PENDING_PURIFICATION,
} from "@/lib/purifier/constants";

export type CaptureGravity = {
  title?: string;
  campoSlug?: CampoSlug;
  universeSlug?: string;
  onda?: string;
  sourceType?: SourceType;
};

export type CaptureInput = {
  channel: IngestaChannel;
  rawText: string;
  filename?: string;
  assetId?: string;
  metadata?: Record<string, string | null>;
  gravity?: CaptureGravity;
};

export type CaptureOptions = {
  extractKg?: boolean;
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
  input: CaptureInput,
): Promise<{ captureId: string; filename: string }> {
  await mkdir(PENDING_PURIFICATION_DIR, { recursive: true });

  const captureId = randomUUID();
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
  const onda = input.gravity?.onda?.trim() || "sin-clasificar";

  const frontmatter = [
    "---",
    `capture_id: "${captureId}"`,
    `channel: "${input.channel}"`,
    `title: ${JSON.stringify(displayTitle)}`,
    `campo: ${JSON.stringify(campoLabel)}`,
    `estado: "${MATERIA_ESTADO_PENDING_PURIFICATION}"`,
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
    onda: gravity.onda,
    sourceType: gravity.sourceType,
  };
}

export async function captureAndPurify(
  input: CaptureInput,
  options?: CaptureOptions,
) {
  const trimmed = input.rawText.trim();
  if (!trimmed) {
    throw new Error("La prima materia no puede estar vacía.");
  }

  const { captureId, filename } = await savePendingPurification({
    ...input,
    rawText: trimmed,
  });

  const contextSeal = resolveContextSeal({
    universeSlug: input.gravity?.universeSlug,
  });
  const resolvedField = resolveCampoSlug(input.gravity?.campoSlug);

  const record = await runPurificationPipeline(
    {
      rawText: trimmed,
      assetId: input.assetId,
      filename: input.filename ?? filename,
      metadata: {
        ...input.metadata,
        channel: input.channel,
        captureId,
        pendingPurificationFile: filename,
        created_at: new Date().toISOString(),
      },
      gravity: toGravityInput(input.gravity),
    },
    { extractKg: options?.extractKg !== false },
  );

  void registerBabelRecord({
    kind: "capture",
    physicalRef: record.reviewId,
    contentPreview: trimmed,
    occurredAt: new Date(),
    contextSeal,
    campoSlug: resolvedField,
    channel: input.channel,
    metadata: {
      captureId,
      pendingFilename: filename,
      assetId: input.assetId ?? null,
    },
  }).catch((error) => {
    console.error("Babel record hook error:", error);
  });

  void import("@/lib/trailing-commands/process").then(
    ({ processTrailingCommands }) =>
      processTrailingCommands({
        rawText: trimmed,
        source: input.channel,
        sourceRef: record.reviewId,
        reviewId: record.reviewId,
        assetId: input.assetId,
        occurredAt: new Date(),
        universeSlug: contextSeal,
      }).catch((error) => {
        console.error("Trailing commands hook error:", error);
      }),
  );

  return {
    captureId,
    pendingFilename: filename,
    reviewId: record.reviewId,
    particula: record.particula,
  };
}
