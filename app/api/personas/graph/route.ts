import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { resolveUniverseKgNodeIds } from "@/lib/babel/universe-refs";
import { buildPersonaGraphSnapshot } from "@/lib/personas/graph";
import type { PersonaGraphViewMode } from "@/lib/personas/model";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parseMode(value: string | null): PersonaGraphViewMode {
  return value === "mixed" ? "mixed" : "exclusive";
}

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const mode = parseMode(request.nextUrl.searchParams.get("mode"));
    const universeSlug = getUniverseFilterSlugFromRequest(request);
    const universeNodeIds = universeSlug
      ? await resolveUniverseKgNodeIds(universeSlug)
      : null;
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
