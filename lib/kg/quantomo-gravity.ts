import "server-only";

import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";
import { cosineSimilarity, parseEmbeddingJson } from "@/lib/mnemosyne/cosine";
import { prisma } from "@/lib/prisma";
import { normalizeKgEdgeWeight } from "@/lib/validations/kg-schema";
import { randomUUID } from "node:crypto";

/** Umbral mínimo de similitud coseno para proponer arista. */
export const SEMANTIC_EDGE_THRESHOLD = 0.62;

/** Gravedad alta del Pensadero (Órbita confirmada). */
export const HIGH_GRAVITY_WEIGHT = 8;

export type QuantomoGravityProposal = {
  sourceQuantomoId: string;
  targetQuantomoId: string;
  sourceNodeId: string;
  targetNodeId: string;
  similarity: number;
  weight: number;
  edgeId?: string;
  created: boolean;
};

/**
 * Mapea similitud coseno [0,1] → Escala Hermética 1–12.
 * 0.62 ≈ 1 · 1.0 ≈ 12 (clamp estricto).
 */
export function similarityToHermeticWeight(similarity: number): number {
  const clamped = Math.min(1, Math.max(0, similarity));
  const raw = Math.round(
    MIN_BASE_WEIGHT +
      clamped * (MAX_BASE_WEIGHT - MIN_BASE_WEIGHT),
  );
  return normalizeKgEdgeWeight(raw).weight;
}

/**
 * Meta-Meteador (modo Alquimista): distancia semántica entre dos Quántomos.
 * Si superan el umbral y ambos tienen espejo KgNode, propone KgEdge
 * con reconocido=false (HITL obligatorio antes de coagular).
 */
export async function proposeSemanticEdgeBetweenQuantomos(
  quantomoAId: string,
  quantomoBId: string,
  options: { threshold?: number; persist?: boolean } = {},
): Promise<QuantomoGravityProposal | null> {
  if (quantomoAId === quantomoBId) return null;

  const threshold = options.threshold ?? SEMANTIC_EDGE_THRESHOLD;
  const persist = options.persist ?? true;

  const [a, b] = await Promise.all([
    prisma.quantomo.findUnique({ where: { id: quantomoAId } }),
    prisma.quantomo.findUnique({ where: { id: quantomoBId } }),
  ]);

  if (!a?.embedding || !b?.embedding || !a.kgNodeId || !b.kgNodeId) {
    return null;
  }

  const va = parseEmbeddingJson(a.embedding);
  const vb = parseEmbeddingJson(b.embedding);
  if (va.length === 0 || vb.length === 0 || va.length !== vb.length) {
    return null;
  }

  const similarity = cosineSimilarity(va, vb);
  if (similarity < threshold) return null;

  const weight = similarityToHermeticWeight(similarity);
  const sourceNodeId = a.kgNodeId;
  const targetNodeId = b.kgNodeId;
  const relationType = "afinidad_semantica";
  const context = `Similitud coseno ${similarity.toFixed(3)} · Meta-Meteador`;

  if (!persist) {
    return {
      sourceQuantomoId: a.id,
      targetQuantomoId: b.id,
      sourceNodeId,
      targetNodeId,
      similarity,
      weight,
      created: false,
    };
  }

  const existing = await prisma.kgEdge.findUnique({
    where: {
      sourceNodeId_targetNodeId_relationType: {
        sourceNodeId,
        targetNodeId,
        relationType,
      },
    },
  });

  if (existing) {
    return {
      sourceQuantomoId: a.id,
      targetQuantomoId: b.id,
      sourceNodeId,
      targetNodeId,
      similarity,
      weight: existing.weight,
      edgeId: existing.id,
      created: false,
    };
  }

  const edge = await prisma.kgEdge.create({
    data: {
      id: randomUUID(),
      sourceNodeId,
      targetNodeId,
      relationType,
      context,
      weight,
      reconocido: false,
      confidence: Math.min(1, Math.max(0, similarity)),
      metadata: {
        source: "meta-meteador",
        similarity,
        sourceQuantomoId: a.id,
        targetQuantomoId: b.id,
      },
    },
  });

  return {
    sourceQuantomoId: a.id,
    targetQuantomoId: b.id,
    sourceNodeId,
    targetNodeId,
    similarity,
    weight,
    edgeId: edge.id,
    created: true,
  };
}

/**
 * Coagula (HITL) una arista propuesta: marca reconocido=true.
 */
export async function coagulateKgEdge(edgeId: string): Promise<{
  id: string;
  reconocido: boolean;
  weight: number;
} | null> {
  const edge = await prisma.kgEdge.findUnique({ where: { id: edgeId } });
  if (!edge) return null;

  const updated = await prisma.kgEdge.update({
    where: { id: edgeId },
    data: { reconocido: true },
    select: { id: true, reconocido: true, weight: true },
  });

  return updated;
}

/**
 * Rechaza una sugerencia semántica (borra arista no reconocida).
 */
export async function rejectSuggestedEdge(edgeId: string): Promise<boolean> {
  const edge = await prisma.kgEdge.findUnique({ where: { id: edgeId } });
  if (!edge || edge.reconocido) return false;

  await prisma.kgEdge.delete({ where: { id: edgeId } });
  return true;
}
