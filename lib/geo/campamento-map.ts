import "server-only";

import {
  resolveContextSealFromRequest,
  shouldFilterByUniverse,
} from "@/lib/babel/context-seal";
import {
  ensurePermanentLocationsSeeded,
  listGeoLocations,
} from "@/lib/geo/service";
import type { GeoMapSnapshot, GeoPayload } from "@/lib/geo/types";
import { listTemporalBlocksByRange } from "@/lib/temporal/queries";
import type { NextRequest } from "next/server";

function hasCoords(
  location: GeoPayload | null | undefined,
): location is GeoPayload {
  return (
    !!location &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  );
}

export async function buildCampamentoGeoSnapshot(input: {
  from: Date;
  to: Date;
  request?: NextRequest;
  universeSlug?: string;
}): Promise<GeoMapSnapshot> {
  await ensurePermanentLocationsSeeded();

  const universe =
    input.universeSlug ??
    (input.request ? resolveContextSealFromRequest(input.request) : null);

  const universeFilter =
    universe && shouldFilterByUniverse(universe) ? universe : undefined;

  const [permanent, temporalRange] = await Promise.all([
    listGeoLocations({ permanentOnly: true }),
    listTemporalBlocksByRange({
      from: input.from,
      to: input.to,
      universeSlug: universeFilter,
    }),
  ]);

  const temporal = temporalRange.blocks
    .filter((block) => hasCoords(block.location))
    .map((block) => ({
      blockId: block.id,
      blockKind: block.kind,
      title: block.title,
      start: block.start,
      status: block.status,
      location: block.location as GeoPayload,
    }));

  return {
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    universe,
    permanent,
    temporal,
  };
}
