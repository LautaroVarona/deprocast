import { searchNodes } from "@/lib/kg/queries";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { resolveUniverseKgNodeIds } from "@/lib/babel/universe-refs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") ?? undefined;
    const q = searchParams.get("q") ?? undefined;
    const campoSlug = searchParams.get("campoSlug") ?? undefined;
    const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const universeSlug = getUniverseFilterSlugFromRequest(request);
    const nodeIds = universeSlug
      ? await resolveUniverseKgNodeIds(universeSlug)
      : null;

    const nodes = await searchNodes({
      type,
      q,
      campoSlug,
      limit: Number.isFinite(limit) ? limit : 50,
      nodeIds,
    });

    return NextResponse.json({ nodes, universe: universeSlug ?? "babel" });
  } catch (error) {
    console.error("KG nodes list error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron listar los nodos del grafo.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
