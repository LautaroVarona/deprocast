import { getDuplicateCandidates } from "@/lib/kg/queries";
import {
  resolveContextSealFromRequest,
  shouldFilterByUniverse,
} from "@/lib/babel/context-seal";
import { resolveUniverseKgNodeIds } from "@/lib/babel/universe-refs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") ?? undefined;
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "100", 10);
    const universeSlug = resolveContextSealFromRequest(request);
    const nodeIds = shouldFilterByUniverse(universeSlug)
      ? await resolveUniverseKgNodeIds(universeSlug)
      : null;

    const candidates = await getDuplicateCandidates({
      type,
      limit: Number.isFinite(limitRaw) ? limitRaw : 100,
      nodeIds,
    });

    return NextResponse.json({ candidates, universe: universeSlug });
  } catch (error) {
    console.error("KG duplicates error:", error);
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    const message =
      error instanceof Error ? error.message : "No se pudieron detectar duplicados.";
    // Schema desfasado (P2021): no tumbar /grafo — degradar a lista vacía.
    if (
      code === "P2021" ||
      message.includes("does not exist") ||
      message.includes("TableDoesNotExist")
    ) {
      return NextResponse.json({
        candidates: [],
        universe: resolveContextSealFromRequest(request),
        degraded: true,
        reason: "kg_schema_missing",
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
