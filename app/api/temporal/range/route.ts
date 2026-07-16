import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { listTemporalBlocksByRange } from "@/lib/temporal/queries";
import { parseIsoDateParam } from "@/lib/temporal/ranges";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const from = parseIsoDateParam(request.nextUrl.searchParams.get("from"));
    const to = parseIsoDateParam(request.nextUrl.searchParams.get("to"));
    if (!from || !to || from >= to) {
      return NextResponse.json({ error: "Rango temporal inválido." }, { status: 400 });
    }

    const universeSlug = getUniverseFilterSlugFromRequest(request);
    const data = await listTemporalBlocksByRange({ from, to, universeSlug });

    return NextResponse.json({
      from: from.toISOString(),
      to: to.toISOString(),
      universe: universeSlug ?? null,
      ...data,
    });
  } catch (error) {
    console.error("Temporal range GET error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo cargar el rango temporal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
