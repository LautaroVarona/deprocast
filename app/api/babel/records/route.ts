import { isUniverseSlug } from "@/lib/babel/context-seal";
import { listBabelRecords } from "@/lib/babel/record-store";
import { isDayOffset } from "@/lib/pendientes/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const { searchParams } = request.nextUrl;
    const universeParam = searchParams.get("universe") ?? undefined;
    const dayParam = searchParams.get("day");
    const limitParam = searchParams.get("limit");

    if (universeParam && !isUniverseSlug(universeParam)) {
      return NextResponse.json({ error: "Universo inválido." }, { status: 400 });
    }

    if (dayParam && !isDayOffset(dayParam)) {
      return NextResponse.json({ error: "Día inválido." }, { status: 400 });
    }

    const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;

    const records = await listBabelRecords({
      universeSlug: universeParam,
      day: dayParam && isDayOffset(dayParam) ? dayParam : undefined,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    return NextResponse.json({
      records,
      universe: universeParam ?? null,
      day: dayParam && isDayOffset(dayParam) ? dayParam : null,
    });
  } catch (error) {
    console.error("Babel records GET error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron listar registros.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
