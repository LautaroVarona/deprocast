import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { resolveUniverseKgNodeIds } from "@/lib/babel/universe-refs";
import { PERSONA_CACHE_HEADER } from "@/lib/personas/client-cache";
import { buildPersonaGraphSnapshot } from "@/lib/personas/graph";
import type { PersonaGraphViewMode } from "@/lib/personas/model";
import {
  applyClientPersonaSnapshot,
  parsePersonaCacheHeader,
} from "@/lib/personas/rehydrate-client";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { withGenesisCoreNodeIds } from "@/lib/yo/genesis-core";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parseMode(value: string | null): PersonaGraphViewMode {
  return value === "mixed" ? "mixed" : "exclusive";
}

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const hints = parsePersonaCacheHeader(
      request.headers.get(PERSONA_CACHE_HEADER),
    );
    if (hints?.length) {
      await applyClientPersonaSnapshot(hints).catch((error) => {
        console.warn("[personas-graph] client rehydrate skipped:", error);
      });
    }

    const mode = parseMode(request.nextUrl.searchParams.get("mode"));
    const universeSlug = getUniverseFilterSlugFromRequest(request);
    let universeNodeIds = universeSlug
      ? await resolveUniverseKgNodeIds(universeSlug)
      : null;
    try {
      universeNodeIds = await withGenesisCoreNodeIds(universeNodeIds);
    } catch (error) {
      console.warn("Personas graph genesis enrich skipped:", error);
    }
    const snapshot = await buildPersonaGraphSnapshot(mode, universeNodeIds);
    return NextResponse.json({
      snapshot,
      universe: universeSlug ?? "babel",
    });
  } catch (error) {
    console.error("Personas graph error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo construir el grafo de personas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
