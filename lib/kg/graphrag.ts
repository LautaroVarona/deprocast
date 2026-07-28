import "server-only";

import { cohereEmbedQuery } from "@/lib/cohere/embed";
import type {
  GraphRagCoreHit,
  GraphRagImpactZone,
  GraphRagOrbitConfirmed,
  GraphRagOrbitSuggested,
} from "@/lib/kg/graphrag-types";
import {
  HIGH_GRAVITY_WEIGHT,
  SEMANTIC_EDGE_THRESHOLD,
  proposeSemanticEdgeBetweenQuantomos,
  similarityToHermeticWeight,
} from "@/lib/kg/quantomo-gravity";
import { cosineSimilarity, parseEmbeddingJson } from "@/lib/mnemosyne/cosine";
import { prisma } from "@/lib/prisma";

export type {
  GraphRagCoreHit,
  GraphRagImpactZone,
  GraphRagOrbitConfirmed,
  GraphRagOrbitSuggested,
} from "@/lib/kg/graphrag-types";

function asStringTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

/**
 * Motor GraphRAG — Pensadero borgeano.
 *
 * A. Embed de la query (Cohere)
 * B. Top-N Quántomos por similitud coseno en memoria
 * C. Órbita: vecinos vía KgEdge.reconocido==true (gravedad alta >8),
 *    + sugerencias semánticas en caliente (HITL, no coaguladas)
 */
export async function runGraphRagSearch(
  query: string,
  options: {
    coreLimit?: number;
    highGravityMin?: number;
    semanticThreshold?: number;
    suggestLimit?: number;
  } = {},
): Promise<GraphRagImpactZone> {
  const trimmed = query.trim();
  const coreLimit = options.coreLimit ?? 5;
  const highGravityMin = options.highGravityMin ?? HIGH_GRAVITY_WEIGHT;
  const semanticThreshold =
    options.semanticThreshold ?? SEMANTIC_EDGE_THRESHOLD;
  const suggestLimit = options.suggestLimit ?? 12;

  const empty: GraphRagImpactZone = {
    query: trimmed,
    core: [],
    orbit: { confirmed: [], suggested: [] },
    meta: {
      coreLimit,
      highGravityMin,
      semanticThreshold,
      quantomosScanned: 0,
    },
  };

  if (!trimmed) return empty;

  const queryVector = await cohereEmbedQuery(trimmed);
  if (queryVector.length === 0) return empty;

  const quantomos = await prisma.quantomo.findMany({
    where: { embedding: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 4000,
  });

  const scored: GraphRagCoreHit[] = [];

  for (const q of quantomos) {
    if (!q.embedding) continue;
    const vector = parseEmbeddingJson(q.embedding);
    if (vector.length !== queryVector.length) continue;

    const score = cosineSimilarity(queryVector, vector);
    if (score <= 0.12) continue;

    scored.push({
      quantomoId: q.id,
      kgNodeId: q.kgNodeId,
      title: q.titleSugerido,
      content: q.content,
      universo: q.universo,
      tagsSemanticos: asStringTags(q.tagsSemanticos),
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const core = scored.slice(0, coreLimit);

  const seedNodeIds = core
    .map((c) => c.kgNodeId)
    .filter((id): id is string => Boolean(id));

  const confirmed: GraphRagOrbitConfirmed[] = [];

  if (seedNodeIds.length > 0) {
    const edges = await prisma.kgEdge.findMany({
      where: {
        reconocido: true,
        OR: [
          { sourceNodeId: { in: seedNodeIds } },
          { targetNodeId: { in: seedNodeIds } },
        ],
      },
      orderBy: { weight: "desc" },
      include: {
        sourceNode: {
          include: { quantomo: { select: { id: true, titleSugerido: true, content: true } } },
        },
        targetNode: {
          include: { quantomo: { select: { id: true, titleSugerido: true, content: true } } },
        },
      },
    });

    const coreNodeSet = new Set(seedNodeIds);
    const coreQuantomoByNode = new Map(
      core
        .filter((c) => c.kgNodeId)
        .map((c) => [c.kgNodeId as string, c.quantomoId]),
    );

    for (const edge of edges) {
      // Órbita iluminada: gravedad alta (>8). El resto reconocido queda fuera del foco.
      if (edge.weight <= highGravityMin) continue;

      const seedIsSource = coreNodeSet.has(edge.sourceNodeId);
      const neighborNode = seedIsSource ? edge.targetNode : edge.sourceNode;
      const seedNodeId = seedIsSource ? edge.sourceNodeId : edge.targetNodeId;

      if (core.some((c) => c.kgNodeId === neighborNode.id)) {
        continue;
      }

      confirmed.push({
        edgeId: edge.id,
        weight: edge.weight,
        relationType: edge.relationType,
        context: edge.context,
        fromNodeId: edge.sourceNodeId,
        toNodeId: edge.targetNodeId,
        neighbor: {
          id: neighborNode.id,
          primaryName: neighborNode.primaryName,
          type: neighborNode.type,
          quantomoId: neighborNode.quantomo?.id ?? null,
          title: neighborNode.quantomo?.titleSugerido ?? null,
          contentPreview: neighborNode.quantomo
            ? neighborNode.quantomo.content.slice(0, 220)
            : null,
        },
        seedQuantomoId: coreQuantomoByNode.get(seedNodeId) ?? core[0]!.quantomoId,
      });
    }
  }

  // Sugerencias semánticas en caliente (HITL): Quántomos cercanos a los del Core
  // que aún no tienen arista reconocida hacia ellos.
  const suggested: GraphRagOrbitSuggested[] = [];
  const coreIds = new Set(core.map((c) => c.quantomoId));
  const confirmedNeighborQuantomoIds = new Set(
    confirmed
      .map((c) => c.neighbor.quantomoId)
      .filter((id): id is string => Boolean(id)),
  );

  const coreRows = quantomos.filter((q) => coreIds.has(q.id));
  const candidates = quantomos.filter(
    (q) =>
      q.embedding &&
      !coreIds.has(q.id) &&
      !confirmedNeighborQuantomoIds.has(q.id),
  );

  type CandScore = {
    source: (typeof coreRows)[number];
    target: (typeof candidates)[number];
    similarity: number;
  };
  const candScores: CandScore[] = [];

  for (const seed of coreRows) {
    if (!seed.embedding || !seed.kgNodeId) continue;
    const seedVec = parseEmbeddingJson(seed.embedding);
    if (seedVec.length === 0) continue;

    for (const other of candidates) {
      if (!other.embedding || !other.kgNodeId) continue;
      const otherVec = parseEmbeddingJson(other.embedding);
      if (otherVec.length !== seedVec.length) continue;

      const similarity = cosineSimilarity(seedVec, otherVec);
      if (similarity < semanticThreshold) continue;

      candScores.push({ source: seed, target: other, similarity });
    }
  }

  candScores.sort((a, b) => b.similarity - a.similarity);

  const seenPairs = new Set<string>();
  for (const cand of candScores) {
    if (suggested.length >= suggestLimit) break;
    const pairKey = [cand.source.id, cand.target.id].sort().join("::");
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    // Persistir propuesta no reconocida (idempotente) para coagulación HITL.
    const proposal = await proposeSemanticEdgeBetweenQuantomos(
      cand.source.id,
      cand.target.id,
      { threshold: semanticThreshold, persist: true },
    );

    suggested.push({
      sourceQuantomoId: cand.source.id,
      targetQuantomoId: cand.target.id,
      sourceTitle: cand.source.titleSugerido,
      targetTitle: cand.target.titleSugerido,
      targetContentPreview: cand.target.content.slice(0, 220),
      similarity: cand.similarity,
      proposedWeight:
        proposal?.weight ?? similarityToHermeticWeight(cand.similarity),
      edgeId: proposal?.edgeId,
      status: "suggested",
    });
  }

  return {
    query: trimmed,
    core,
    orbit: { confirmed, suggested },
    meta: {
      coreLimit,
      highGravityMin,
      semanticThreshold,
      quantomosScanned: quantomos.length,
    },
  };
}
