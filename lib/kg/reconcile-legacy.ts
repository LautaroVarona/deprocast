import { ingestKgExtraction } from "@/lib/kg/ingest";
import { mapLegacyEntityType } from "@/lib/kg/normalize";
import type { LlmEntity, LlmKgExtraction, LlmRelation } from "@/lib/kg/types";
import { prisma } from "@/lib/prisma";

export type ReconcileReport = {
  legacyEntities: number;
  legacyTags: number;
  parentChunkLinks: number;
  chunksProcessed: number;
  chunksSkipped: number;
  nodesResolved: number;
  edgesCreated: number;
  mentionsCreated: number;
};

function buildCoOccurrenceRelations(names: string[]): LlmRelation[] {
  const relations: LlmRelation[] = [];
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];

  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      relations.push({
        fromName: unique[i],
        toName: unique[j],
        relationType: "relacionado_con",
        context:
          "Co-ocurrencia en el mismo parent chunk (migración desde Entity/Tag legacy).",
        weight: 2,
        confidence: 0.5,
      });
    }
  }

  return relations;
}

function buildChunkExtraction(input: {
  entities: { name: string; type: string }[];
  tags: string[];
  parentChunkContent: string;
}): LlmKgExtraction {
  const entities: LlmEntity[] = [];

  for (const legacy of input.entities) {
    entities.push({
      name: legacy.name,
      type: mapLegacyEntityType(legacy.type),
      metadata: { migratedFrom: "Entity", legacyType: legacy.type },
      mentions: [{ fragment: legacy.name }],
      confidence: 0.65,
    });
  }

  for (const tagName of input.tags) {
    const name = tagName.trim();
    if (!name) continue;
    entities.push({
      name,
      type: "concepto",
      metadata: { rol: "meta_tag", migratedFrom: "Tag" },
      mentions: [{ fragment: name }],
      confidence: 0.6,
    });
  }

  const allNames = [
    ...input.entities.map((e) => e.name),
    ...input.tags.map((t) => t.trim()).filter(Boolean),
  ];

  return {
    entities,
    relations: buildCoOccurrenceRelations(allNames),
  };
}

type ChunkPayload = {
  parentChunkId: string;
  assetId: string | null;
  transcriptId: string;
  content: string;
  entities: { name: string; type: string }[];
  tags: string[];
};

/**
 * Migra datos de Entity/Tag/ParentChunkEntity/ParentChunkTag al grafo KgNode.
 * Idempotente: reutiliza resolveEntities y deduplicación de menciones.
 */
export async function reconcileLegacyEntities(): Promise<ReconcileReport> {
  const [entityLinks, tagLinks] = await Promise.all([
    prisma.parentChunkEntity.findMany({
      include: {
        entity: true,
        parentChunk: { include: { transcript: true } },
      },
    }),
    prisma.parentChunkTag.findMany({
      include: {
        tag: true,
        parentChunk: { include: { transcript: true } },
      },
    }),
  ]);

  const chunkMap = new Map<string, ChunkPayload>();

  for (const link of entityLinks) {
    const { parentChunk } = link;
    const existing = chunkMap.get(parentChunk.id) ?? {
      parentChunkId: parentChunk.id,
      assetId: parentChunk.transcript.assetId,
      transcriptId: parentChunk.transcriptId,
      content: parentChunk.content,
      entities: [],
      tags: [],
    };
    existing.entities.push({ name: link.entity.name, type: link.entity.type });
    chunkMap.set(parentChunk.id, existing);
  }

  for (const link of tagLinks) {
    const { parentChunk } = link;
    const existing = chunkMap.get(parentChunk.id) ?? {
      parentChunkId: parentChunk.id,
      assetId: parentChunk.transcript.assetId,
      transcriptId: parentChunk.transcriptId,
      content: parentChunk.content,
      entities: [],
      tags: [],
    };
    existing.tags.push(link.tag.name);
    chunkMap.set(parentChunk.id, existing);
  }

  const report: ReconcileReport = {
    legacyEntities: entityLinks.length,
    legacyTags: tagLinks.length,
    parentChunkLinks: entityLinks.length + tagLinks.length,
    chunksProcessed: 0,
    chunksSkipped: 0,
    nodesResolved: 0,
    edgesCreated: 0,
    mentionsCreated: 0,
  };

  const nodeIdSet = new Set<string>();
  const edgeIdSet = new Set<string>();
  const mentionIdSet = new Set<string>();

  for (const chunk of chunkMap.values()) {
    if (chunk.entities.length === 0 && chunk.tags.length === 0) {
      report.chunksSkipped += 1;
      continue;
    }

    const extraction = buildChunkExtraction({
      entities: chunk.entities,
      tags: chunk.tags,
      parentChunkContent: chunk.content,
    });

    const result = await ingestKgExtraction({
      extraction,
      source: {
        type: "parent_chunk",
        id: chunk.parentChunkId,
        metadata: {
          assetId: chunk.assetId,
          transcriptId: chunk.transcriptId,
          migratedFrom: "Entity/Tag",
        },
        confidence: 0.65,
      },
    });

    for (const id of result.nodeIds) nodeIdSet.add(id);
    for (const id of result.edgeIds) edgeIdSet.add(id);
    for (const id of result.mentionIds) mentionIdSet.add(id);
    report.chunksProcessed += 1;
  }

  report.nodesResolved = nodeIdSet.size;
  report.edgesCreated = edgeIdSet.size;
  report.mentionsCreated = mentionIdSet.size;

  return report;
}
