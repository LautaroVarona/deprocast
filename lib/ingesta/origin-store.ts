import "server-only";

import {
  assertOriginAttribution,
  computeDiaSemana,
  type OriginAttribution,
} from "@/lib/ingesta/origin";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";

export type PersistOriginInput = {
  origin: OriginAttribution;
  locationName?: string | null;
  geoLocationId?: string | null;
};

export async function persistOriginAttribution(
  input: PersistOriginInput,
): Promise<{ id: string }> {
  assertOriginAttribution(input.origin);

  const capturedAt = new Date(input.origin.capturedAt);
  const timestampExacto = Number.isNaN(capturedAt.getTime())
    ? new Date()
    : capturedAt;

  const locationName =
    input.locationName?.trim() ||
    (typeof input.origin.meta?.locationName === "string"
      ? input.origin.meta.locationName.trim()
      : "") ||
    null;

  const row = await prisma.originAttribution.create({
    data: {
      id: randomUUID(),
      channel: input.origin.channel,
      timestampExacto,
      diaSemana: computeDiaSemana(timestampExacto),
      locationName,
      actors: input.origin.actors,
    },
  });

  return { id: row.id };
}

export async function resolveLocationNameFromGeo(
  geoLocationId?: string | null,
): Promise<string | null> {
  if (!geoLocationId?.trim()) return null;

  const geo = await prisma.geoLocation.findUnique({
    where: { id: geoLocationId.trim() },
    select: { name: true },
  });

  return geo?.name?.trim() || null;
}
