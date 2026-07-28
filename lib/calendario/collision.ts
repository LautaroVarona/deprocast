import "server-only";

import { prisma } from "@/lib/prisma";

export class ImmutableCollisionError extends Error {
  readonly blockTitle: string;
  readonly blockId: string;

  constructor(blockTitle: string, blockId: string) {
    super(
      `Choque con bloque inmutable «${blockTitle}». La energía rebota: elegí otro hueco.`,
    );
    this.name = "ImmutableCollisionError";
    this.blockTitle = blockTitle;
    this.blockId = blockId;
  }
}

function resolveEnd(start: Date, endsAt: Date | null, durationMin: number | null): Date {
  if (endsAt) return endsAt;
  const minutes = durationMin && durationMin > 0 ? durationMin : 60;
  return new Date(start.getTime() + minutes * 60_000);
}

/** Detecta solapamiento con bloques IMMUTABLE (ej. Jornada Laboral Varona). */
export async function assertNoImmutableCollision(
  start: Date,
  durationMin: number,
): Promise<void> {
  const end = new Date(start.getTime() + durationMin * 60_000);
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const candidates = await prisma.contextEvent.findMany({
    where: {
      blockKind: "IMMUTABLE",
      occurredAt: { gte: dayStart, lt: dayEnd },
    },
    select: {
      id: true,
      content: true,
      occurredAt: true,
      endsAt: true,
      durationMin: true,
    },
  });

  for (const block of candidates) {
    const blockEnd = resolveEnd(block.occurredAt, block.endsAt, block.durationMin);
    const overlaps = block.occurredAt < end && blockEnd > start;
    if (overlaps) {
      throw new ImmutableCollisionError(block.content, block.id);
    }
  }
}
