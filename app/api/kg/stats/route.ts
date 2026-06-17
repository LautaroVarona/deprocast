import {
  getCentralityRanking,
  getKgStats,
  getRepeatedIdeas,
} from "@/lib/kg/analytics";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [stats, centrality, repeatedIdeas] = await Promise.all([
      getKgStats(),
      getCentralityRanking({ limit: 20, excludeCode: true }),
      getRepeatedIdeas({ limit: 20 }),
    ]);

    return NextResponse.json({ stats, centrality, repeatedIdeas });
  } catch (error) {
    console.error("KG stats error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron calcular las estadisticas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
