import type { LlmEntity, LlmKgExtraction, LlmRelation } from "@/lib/kg/types";
import { isNodeType, isRelationType } from "@/lib/kg/types";
import { normalizeKgEdgeWeight } from "@/lib/validations/kg-schema";

function parseEntity(raw: unknown): LlmEntity | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const type = typeof item.type === "string" ? item.type.trim() : "";
  if (!name || !isNodeType(type)) return null;

  const aliases = Array.isArray(item.aliases)
    ? item.aliases.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
    : undefined;

  const secondaryTypes = Array.isArray(item.secondaryTypes)
    ? item.secondaryTypes.filter((t): t is LlmEntity["type"] => typeof t === "string" && isNodeType(t))
    : undefined;

  const mentions = Array.isArray(item.mentions)
    ? item.mentions
        .map((m) => {
          if (!m || typeof m !== "object") return null;
          const mention = m as Record<string, unknown>;
          const fragment = typeof mention.fragment === "string" ? mention.fragment.trim() : "";
          if (!fragment) return null;
          return {
            fragment,
            offsetStart: typeof mention.offsetStart === "number" ? mention.offsetStart : undefined,
            offsetEnd: typeof mention.offsetEnd === "number" ? mention.offsetEnd : undefined,
          };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null)
    : undefined;

  return {
    name,
    type,
    aliases,
    personaKind:
      item.personaKind === "fisica" || item.personaKind === "juridica"
        ? item.personaKind
        : undefined,
    secondaryTypes,
    metadata:
      item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
        ? (item.metadata as Record<string, unknown>)
        : undefined,
    mentions,
    confidence: typeof item.confidence === "number" ? item.confidence : undefined,
  };
}

function parseRelation(raw: unknown): LlmRelation | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const fromName = typeof item.fromName === "string" ? item.fromName.trim() : "";
  const toName = typeof item.toName === "string" ? item.toName.trim() : "";
  const relationType = typeof item.relationType === "string" ? item.relationType.trim() : "";
  const context = typeof item.context === "string" ? item.context.trim() : "";
  if (!fromName || !toName || !isRelationType(relationType) || !context) return null;

  let weight: number | undefined;
  if (item.weight !== undefined && item.weight !== null) {
    weight = normalizeKgEdgeWeight(item.weight).weight;
  }

  return {
    fromName,
    toName,
    relationType,
    context,
    weight,
    confidence: typeof item.confidence === "number" ? item.confidence : undefined,
  };
}

function parseObject(raw: unknown): LlmKgExtraction {
  if (!raw || typeof raw !== "object") {
    return { entities: [], relations: [] };
  }

  const data = raw as Record<string, unknown>;
  const entities = Array.isArray(data.entities)
    ? data.entities.map(parseEntity).filter((e): e is LlmEntity => e !== null)
    : [];
  const relations = Array.isArray(data.relations)
    ? data.relations.map(parseRelation).filter((r): r is LlmRelation => r !== null)
    : [];

  return { entities, relations };
}

export function parseLlmKgExtraction(raw: string): LlmKgExtraction {
  const trimmed = raw.trim();

  try {
    return parseObject(JSON.parse(trimmed));
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      try {
        return parseObject(JSON.parse(fenced[1].trim()));
      } catch {
        // continue
      }
    }

    const bracket = trimmed.match(/\{[\s\S]*\}/);
    if (bracket) {
      try {
        return parseObject(JSON.parse(bracket[0]));
      } catch {
        // ignore
      }
    }
  }

  return { entities: [], relations: [] };
}
