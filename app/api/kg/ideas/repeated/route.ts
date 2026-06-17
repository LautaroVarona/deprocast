import { getRepeatedIdeas } from "@/lib/kg/analytics";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const limitRaw = Number.parseInt(
      request.nextUrl.searchParams.get("limit") ?? "50",
      10,
    );
    const typesParam = request.nextUrl.searchParams.get("types");
    const types = typesParam
      ? typesParam.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    const ideas = await getRepeatedIdeas({
      limit: Number.isFinite(limitRaw) ? limitRaw : 50,
      types,
    });
    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("KG repeated ideas error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron obtener ideas repetidas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
