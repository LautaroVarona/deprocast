import { indexPurifierDocMemory } from "@/lib/mnemosyne/hooks";
import { prisma } from "@/lib/prisma";
import {
  deleteReviewRecord,
  loadReviewRecord,
} from "@/lib/purifier/engine";
import type { PurifierReviewRecord } from "@/lib/purifier/types";
import { ingestKgExtraction } from "@/lib/kg/ingest";
import type { LlmEntity } from "@/lib/kg/types";
import { resolveCampoSlug } from "@/lib/projects/campos";
import {
  buildOriginContext,
  createProposal,
} from "@/lib/projects/proposal-store";
import type { ProposalOriginType } from "@/lib/projects/types";

export type ApproveReviewInput = {
  reviewId: string;
  campoSlug: string;
  title: string;
  markdownBody: string;
  dimensions: {
    materia: string;
    particula: string;
    posicion: string;
    onda: string;
    tiempo: string;
    espacio: string;
    field: string;
    prioridad: number;
    impacto: number;
    dificultad: number;
  };
  metaTagsSecundarios: string[];
};

function resolveOriginType(record: PurifierReviewRecord): ProposalOriginType {
  const sourceType = record.gravity.sourceType ?? record.source.metadata?.sourceType;
  if (sourceType === "ai_chat") return "ai_chat";
  return "purifier";
}

async function persistFractalChunks(
  record: PurifierReviewRecord,
  transcriptId: string,
): Promise<{ id: string; content: string }[]> {
  await prisma.parentChunk.deleteMany({ where: { transcriptId } });

  const created: { id: string; content: string }[] = [];

  for (const parent of record.fractalSegments) {
    const content = parent.children.map((c) => c.content).join("\n\n");
    const parentChunk = await prisma.parentChunk.create({
      data: {
        transcriptId,
        content,
        startTimeMs: parent.index * 1000,
        endTimeMs: (parent.index + 1) * 1000,
        summary: parent.context,
      },
    });

    for (const child of parent.children) {
      await prisma.childChunk.create({
        data: {
          parentId: parentChunk.id,
          content: child.content,
        },
      });
    }

    created.push({ id: parentChunk.id, content });
  }

  return created;
}

async function ingestFractalChunksToKg(
  record: PurifierReviewRecord,
  chunks: { id: string; content: string }[],
  assetId?: string,
  reviewId?: string,
): Promise<void> {
  const extraction = record.kgExtraction;
  if (!extraction?.entities.length || chunks.length === 0) return;

  for (const chunk of chunks) {
    const contentLower = chunk.content.toLowerCase();
    const entities: LlmEntity[] = extraction.entities
      .filter((entity) => contentLower.includes(entity.name.toLowerCase()))
      .map((entity) => ({
        ...entity,
        mentions: [{ fragment: entity.name }],
      }));

    if (entities.length === 0) continue;

    await ingestKgExtraction({
      extraction: { entities, relations: [] },
      source: {
        type: "parent_chunk",
        id: chunk.id,
        metadata: { assetId, reviewId, source: "purifier_approve" },
        confidence: 0.75,
      },
    });
  }
}

export async function approveToProposal(
  input: ApproveReviewInput,
): Promise<{ proposalId: string; title: string }> {
  const loaded = await loadReviewRecord(input.reviewId);
  if (!loaded) {
    throw new Error("Registro de revisión no encontrado.");
  }

  const campoSlug = resolveCampoSlug(input.campoSlug);
  const originType = resolveOriginType(loaded.record);
  const now = new Date();

  const proposal = await createProposal({
    title: input.title.trim(),
    description: input.markdownBody.trim().slice(0, 500),
    originContext: buildOriginContext(originType, now, { title: input.title.trim() }),
    originType,
    originRef: input.reviewId,
    suggestedCampoSlug: campoSlug,
    sourcePayload: {
      reviewId: input.reviewId,
      markdownBody: input.markdownBody,
      dimensions: input.dimensions,
      metaTagsSecundarios: input.metaTagsSecundarios,
      gravity: {
        prioridad: input.dimensions.prioridad,
        impacto: input.dimensions.impacto,
        dificultad: input.dimensions.dificultad,
        campoSlug,
      },
      particula: input.dimensions.particula || loaded.record.particula,
      assetId: loaded.record.assetId,
    },
  });

  void indexPurifierDocMemory({
    reviewId: input.reviewId,
    title: input.title.trim(),
    body: input.markdownBody.trim(),
  }).catch((error) => {
    console.error("Mnemosyne purifier index error:", error);
  });

  if (loaded.record.assetId) {
    const transcript = await prisma.transcript.findUnique({
      where: { assetId: loaded.record.assetId },
    });

    if (transcript) {
      const fractalChunks = await persistFractalChunks(loaded.record, transcript.id);
      await ingestFractalChunksToKg(
        loaded.record,
        fractalChunks,
        loaded.record.assetId ?? undefined,
        input.reviewId,
      );
    }
  }

  await deleteReviewRecord(input.reviewId);

  void import("@/lib/historial/pipeline-log").then(({ logApprovedActivity }) =>
    logApprovedActivity({
      reviewId: input.reviewId,
      title: input.title.trim(),
    }).catch((error) => {
      console.error("Historial approve log error:", error);
    }),
  );

  return {
    proposalId: proposal.id,
    title: proposal.title,
  };
}

/** @deprecated Usar approveToProposal — mantiene alias para compatibilidad interna. */
export const approveAndCoagulate = approveToProposal;
