import { resolveNameToId, type NameToIdMap } from "@/lib/kg/identity";
import { indexKgMentionMemory } from "@/lib/mnemosyne/hooks";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { LlmEntity, MentionSource } from "@/lib/kg/types";

export async function createMentionsFromExtraction(
  entities: LlmEntity[],
  nameToIdMap: NameToIdMap,
  source: MentionSource,
): Promise<string[]> {
  const mentionIds: string[] = [];

  for (const entity of entities) {
    const nodeId = resolveNameToId(entity.name, nameToIdMap);
    if (!nodeId || !entity.mentions?.length) continue;

    for (const mention of entity.mentions) {
      const existing = await prisma.kgMention.findFirst({
        where: {
          nodeId,
          sourceType: source.type,
          sourceId: source.id,
          fragment: mention.fragment,
        },
      });

      if (existing) {
        mentionIds.push(existing.id);
        continue;
      }

      const created = await prisma.kgMention.create({
        data: {
          nodeId,
          sourceType: source.type,
          sourceId: source.id,
          fragment: mention.fragment,
          offsetStart: mention.offsetStart,
          offsetEnd: mention.offsetEnd,
          confidence:
            typeof source.confidence === "number"
              ? Math.min(1, Math.max(0, source.confidence))
              : 0.6,
          metadata: (source.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });

      mentionIds.push(created.id);

      void indexKgMentionMemory({
        mentionId: created.id,
        nodeName: entity.name,
        fragment: mention.fragment,
        sourceType: source.type,
        sourceId: source.id,
      }).catch((error) => {
        console.error("Mnemosyne kg mention index error:", error);
      });
    }
  }

  return mentionIds;
}
