import { getCentralityRanking } from "@/lib/kg/analytics";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const limitRaw = Number.parseInt(
      request.nextUrl.searchParams.get("limit") ?? "50",
      10,
    );
    const type = request.nextUrl.searchParams.get("type") ?? undefined;
    const excludeCode = request.nextUrl.searchParams.get("excludeCode") === "true";

    const ranking = await getCentralityRanking({
      limit: Number.isFinite(limitRaw) ? limitRaw : 50,
      type,
      excludeCode,
    });

    return NextResponse.json({ ranking });
  } catch (error) {
    console.error("KG centrality error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo calcular la centralidad.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
