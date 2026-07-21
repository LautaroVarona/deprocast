import { buildMissionDeck } from "@/lib/calendario/deck";
import { deckQuerySchema } from "@/lib/calendario/types";
import { isEcosystemArea } from "@/lib/calendario/service";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const universeSlug = getUniverseFilterSlugFromRequest(request);
    const areaParam = request.nextUrl.searchParams.get("area");
    const parsed = deckQuerySchema.parse({
      area: areaParam && isEcosystemArea(areaParam) ? areaParam : undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    const cards = await buildMissionDeck({
      universeSlug,
      area: parsed.area,
      limit: parsed.limit,
    });

    return NextResponse.json({ cards, universe: universeSlug ?? "babel" });
  } catch (error) {
    console.error("Calendario deck GET error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo cargar el mazo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
