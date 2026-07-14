import { getGraphSnapshot } from "@/lib/kg/analytics";
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
    const typesParam = searchParams.get("types");
    const types = typesParam
      ? typesParam.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;
    const excludeCode = searchParams.get("excludeCode") === "true";
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "1500", 10);
    const universeSlug = resolveContextSealFromRequest(request);
    const nodeIds = shouldFilterByUniverse(universeSlug)
      ? await resolveUniverseKgNodeIds(universeSlug)
      : null;

    const snapshot = await getGraphSnapshot({
      types,
      excludeCode,
      limit: Number.isFinite(limitRaw) ? limitRaw : 1500,
      nodeIds,
    });

    return NextResponse.json({ ...snapshot, universe: universeSlug });
  } catch (error) {
    console.error("KG graph snapshot error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo construir el grafo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
