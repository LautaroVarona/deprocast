import {
  getCentralityRanking,
  getKgStats,
  getRepeatedIdeas,
} from "@/lib/kg/analytics";
import {
  resolveContextSealFromRequest,
  shouldFilterByUniverse,
} from "@/lib/babel/context-seal";
import { resolveUniverseKgNodeIds } from "@/lib/babel/universe-refs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const universeSlug = resolveContextSealFromRequest(request);
    const nodeIds = shouldFilterByUniverse(universeSlug)
      ? await resolveUniverseKgNodeIds(universeSlug)
      : null;

    const [stats, centrality, repeatedIdeas] = await Promise.all([
      getKgStats({ nodeIds }),
      getCentralityRanking({ limit: 20, excludeCode: true, nodeIds }),
      getRepeatedIdeas({ limit: 20, nodeIds }),
    ]);

    return NextResponse.json({ stats, centrality, repeatedIdeas, universe: universeSlug });
  } catch (error) {
    console.error("KG stats error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron calcular las estadisticas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
