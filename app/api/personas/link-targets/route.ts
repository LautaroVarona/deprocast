import { listPersonaLinkTargets } from "@/lib/personas/relations";
import type { PersonaLinkTargetKind } from "@/lib/personas/model";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
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

    const { searchParams } = request.nextUrl;
    const kind = parseKind(searchParams.get("kind"));
    if (!kind) {
      return NextResponse.json(
        { error: "Parámetro kind inválido (persona|proyecto|campo)." },
        { status: 400 },
      );
    }

    const targets = await listPersonaLinkTargets({
      kind,
      q: searchParams.get("q") ?? undefined,
      excludePersonaId: searchParams.get("excludePersonaId") ?? undefined,
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
