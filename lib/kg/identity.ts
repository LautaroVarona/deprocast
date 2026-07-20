import { prisma } from "@/lib/prisma";
import { Prisma, type KgNode } from "@prisma/client";
import {
  namesMatchFuzzy,
  normalizeName,
  parseAliasesJson,
  parseMetadataJson,
} from "@/lib/kg/normalize";
import type { LlmEntity } from "@/lib/kg/types";

export type NameToIdMap = Map<string, string>;

function collectLookupKeys(name: string, aliases: string[]): string[] {
  const keys = new Set<string>();
  keys.add(normalizeName(name));
  for (const alias of aliases) {
    keys.add(normalizeName(alias));
  }
  return [...keys].filter(Boolean);
}

function nodeMatchesName(node: KgNode, normalizedQuery: string): boolean {
  if (normalizeName(node.primaryName) === normalizedQuery) return true;
  const aliases = parseAliasesJson(node.aliases);
  return aliases.some((alias) => normalizeName(alias) === normalizedQuery);
}

function nodeMatchesFuzzy(node: KgNode, query: string): boolean {
  if (namesMatchFuzzy(node.primaryName, query)) return true;
  const aliases = parseAliasesJson(node.aliases);
  return aliases.some((alias) => namesMatchFuzzy(alias, query));
}

function clampConfidence(value: number | undefined, fallback = 0.6): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function buildNodeMetadata(entity: LlmEntity): Record<string, unknown> {
  const metadata: Record<string, unknown> = { ...(entity.metadata ?? {}) };

  if (entity.personaKind) {
    metadata.personaKind = entity.personaKind;
  }
  if (entity.secondaryTypes?.length) {
    metadata.secondaryTypes = entity.secondaryTypes;
    if (entity.secondaryTypes.includes("proyecto")) {
      metadata.alsoProject = true;
    }
  }

  return metadata;
}

export async function mergeAliases(
  node: KgNode,
  incoming: string[],
): Promise<KgNode> {
  const existing = parseAliasesJson(node.aliases);
  const existingNormalized = new Set(existing.map(normalizeName));
  const merged = [...existing];

  for (const alias of incoming) {
    const trimmed = alias.trim();
    if (!trimmed) continue;
    if (normalizeName(trimmed) === normalizeName(node.primaryName)) continue;
    if (existingNormalized.has(normalizeName(trimmed))) continue;
    merged.push(trimmed);
    existingNormalized.add(normalizeName(trimmed));
  }

  if (merged.length === existing.length) {
    return node;
  }

  return prisma.kgNode.update({
    where: { id: node.id },
    data: { aliases: merged },
  });
}

async function findExistingNode(
  entity: LlmEntity,
  allNames: string[],
): Promise<KgNode | null> {
  const candidates = await prisma.kgNode.findMany({
    where: { type: entity.type },
  });

  for (const normalized of allNames) {
    const exact = candidates.find((node) => nodeMatchesName(node, normalized));
    if (exact) return exact;
  }

  for (const name of [entity.name, ...(entity.aliases ?? [])]) {
    const fuzzy = candidates.find((node) => nodeMatchesFuzzy(node, name));
    if (fuzzy) return fuzzy;
  }

  return null;
}

function registerEntityInMap(
  map: NameToIdMap,
  entity: LlmEntity,
  nodeId: string,
): void {
  for (const key of collectLookupKeys(entity.name, entity.aliases ?? [])) {
    map.set(key, nodeId);
  }
}

export function resolveNameToId(
  name: string,
  map: NameToIdMap,
): string | undefined {
  const direct = map.get(normalizeName(name));
  if (direct) return direct;

  for (const [key, id] of map.entries()) {
    if (namesMatchFuzzy(key, name)) return id;
  }

  return undefined;
}

export async function resolveEntities(
  entities: LlmEntity[],
  options: { reconocido?: boolean } = {},
): Promise<NameToIdMap> {
  const map: NameToIdMap = new Map();
  const reconocido = options.reconocido ?? false;

  for (const entity of entities) {
    const aliases = entity.aliases ?? [];
    const allNames = collectLookupKeys(entity.name, aliases);
    const existing = await findExistingNode(entity, allNames);

    if (existing) {
      const updated = await mergeAliases(existing, [entity.name, ...aliases]);
      const mergedMetadata = {
        ...parseMetadataJson(updated.metadata),
        ...buildNodeMetadata(entity),
      };

      // Reforzar confianza: ver una entidad repetidamente la consolida.
      const reinforced = Math.min(
        1,
        updated.confidence + (1 - updated.confidence) * 0.25,
      );

      const node = await prisma.kgNode.update({
        where: { id: updated.id },
        data: {
          metadata: mergedMetadata as Prisma.InputJsonValue,
          confidence: reinforced,
          ...(reconocido ? { reconocido: true } : {}),
        },
      });

      registerEntityInMap(map, entity, node.id);
      continue;
    }

    const created = await prisma.kgNode.create({
      data: {
        primaryName: entity.name.trim(),
        type: entity.type,
        aliases,
        metadata: buildNodeMetadata(entity) as Prisma.InputJsonValue,
        confidence: clampConfidence(entity.confidence),
        reconocido,
      },
    });

    registerEntityInMap(map, entity, created.id);
  }

  return map;
}

export async function createDualNatureEdges(
  entities: LlmEntity[],
  map: NameToIdMap,
  options: { reconocido?: boolean } = {},
): Promise<string[]> {
  const edgeIds: string[] = [];
  const reconocido = options.reconocido ?? false;

  for (const entity of entities) {
    if (!entity.secondaryTypes?.length) continue;

    const sourceId = resolveNameToId(entity.name, map);
    if (!sourceId) continue;

    for (const secondaryType of entity.secondaryTypes) {
      if (secondaryType === entity.type) continue;

      const secondaryName = entity.name;
      let targetId = resolveNameToId(secondaryName, map);

      const secondaryNode = await prisma.kgNode.findUnique({
        where: {
          primaryName_type: {
            primaryName: secondaryName,
            type: secondaryType,
          },
        },
      });

      if (secondaryNode) {
        targetId = secondaryNode.id;
        if (reconocido && !secondaryNode.reconocido) {
          await prisma.kgNode.update({
            where: { id: secondaryNode.id },
            data: { reconocido: true },
          });
        }
      } else if (!targetId) {
        const created = await prisma.kgNode.create({
          data: {
            primaryName: secondaryName,
            type: secondaryType,
            aliases: entity.aliases ?? [],
            metadata: buildNodeMetadata(entity) as Prisma.InputJsonValue,
            confidence: clampConfidence(entity.confidence),
            reconocido,
          },
        });
        targetId = created.id;
        registerEntityInMap(map, { ...entity, type: secondaryType }, created.id);
      }

      if (!targetId || targetId === sourceId) continue;

      const edge = await prisma.kgEdge.upsert({
        where: {
          sourceNodeId_targetNodeId_relationType: {
            sourceNodeId: sourceId,
            targetNodeId: targetId,
            relationType: "relacionado_con",
          },
        },
        create: {
          sourceNodeId: sourceId,
          targetNodeId: targetId,
          relationType: "relacionado_con",
          context: `Naturaleza dual: ${entity.type} y ${secondaryType} según extracción.`,
          reconocido,
          metadata: {},
        },
        update: {
          context: `Naturaleza dual: ${entity.type} y ${secondaryType} según extracción.`,
          ...(reconocido ? { reconocido: true } : {}),
        },
      });

      edgeIds.push(edge.id);
    }
  }

  return edgeIds;
}
