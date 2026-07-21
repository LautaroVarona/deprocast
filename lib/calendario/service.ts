import "server-only";

import type { BlockKind, EcosystemArea } from "@/lib/calendario/constants";
import { BLOCK_KINDS, ECOSYSTEM_AREAS } from "@/lib/calendario/constants";
import { filterContextEventsForUniverse } from "@/lib/babel/universe-refs";
import { mapContextEvent } from "@/lib/events/mappers";
import type { ContextEventDto } from "@/lib/events/types";
import { prisma } from "@/lib/prisma";

export function isBlockKind(value: unknown): value is BlockKind {
  return typeof value === "string" && BLOCK_KINDS.includes(value as BlockKind);
}

export function isEcosystemArea(value: unknown): value is EcosystemArea {
  return typeof value === "string" && ECOSYSTEM_AREAS.includes(value as EcosystemArea);
}

export async function listCalendarEvents(input: {
  from: Date;
  to: Date;
  universeSlug?: string;
  area?: EcosystemArea;
  blockKind?: BlockKind;
}): Promise<ContextEventDto[]> {
  const events = await prisma.contextEvent.findMany({
    where: {
      occurredAt: { gte: input.from, lt: input.to },
      status: { not: "rejected" },
      ...(input.area ? { ecosystemArea: input.area } : {}),
      ...(input.blockKind ? { blockKind: input.blockKind } : {}),
    },
    orderBy: { occurredAt: "asc" },
    take: 500,
    include: { links: true },
  });

  const filtered = await filterContextEventsForUniverse(events, input.universeSlug);
  return filtered.map(mapContextEvent);
}
