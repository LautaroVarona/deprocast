import { getDuplicateCandidates } from "@/lib/kg/queries";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") ?? undefined;
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "100", 10);

    const candidates = await getDuplicateCandidates({
      type,
      limit: Number.isFinite(limitRaw) ? limitRaw : 100,
    });

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("KG duplicates error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron detectar duplicados.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
