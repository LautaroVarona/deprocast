import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { resolveUniverseKgNodeIds } from "@/lib/babel/universe-refs";
import { PERSONA_CACHE_HEADER } from "@/lib/personas/client-cache";
import { listPersonaLinkTargets } from "@/lib/personas/relations";
import type { PersonaLinkTargetKind } from "@/lib/personas/model";
import {
  applyClientPersonaSnapshot,
  parsePersonaCacheHeader,
} from "@/lib/personas/rehydrate-client";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { withGenesisCoreNodeIds } from "@/lib/yo/genesis-core";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parseKind(value: string | null): PersonaLinkTargetKind | null {
  if (value === "persona" || value === "proyecto" || value === "campo") {
    return value;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const hints = parsePersonaCacheHeader(
      request.headers.get(PERSONA_CACHE_HEADER),
    );
    if (hints?.length) {
      await applyClientPersonaSnapshot(hints).catch((error) => {
        console.warn("[link-targets] client rehydrate skipped:", error);
      });
    }

    const { searchParams } = request.nextUrl;
    const kind = parseKind(searchParams.get("kind"));
    if (!kind) {
      return NextResponse.json(
        { error: "Parámetro kind inválido (persona|proyecto|campo)." },
        { status: 400 },
      );
    }

    const universeSlug = getUniverseFilterSlugFromRequest(request);
    let nodeIds = universeSlug
      ? await resolveUniverseKgNodeIds(universeSlug)
      : null;
    if (nodeIds) {
      nodeIds = await withGenesisCoreNodeIds(nodeIds);
    }

    const targets = await listPersonaLinkTargets({
      kind,
      q: searchParams.get("q") ?? undefined,
      excludePersonaId: searchParams.get("excludePersonaId") ?? undefined,
      nodeIds: kind === "persona" || kind === "proyecto" ? nodeIds : null,
    });

    return NextResponse.json({ targets });
  } catch (error) {
    console.error("Persona link targets error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los destinos de vínculo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
