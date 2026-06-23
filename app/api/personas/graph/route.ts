import { buildPersonaGraphSnapshot } from "@/lib/personas/graph";
import type { PersonaGraphViewMode } from "@/lib/personas/model";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parseMode(value: string | null): PersonaGraphViewMode {
  return value === "mixed" ? "mixed" : "exclusive";
}

export async function GET(request: NextRequest) {
  try {
    const mode = parseMode(request.nextUrl.searchParams.get("mode"));
    const snapshot = await buildPersonaGraphSnapshot(mode);
    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Personas graph error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo construir el grafo de personas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
