import { dayRangeForOffset } from "@/lib/pendientes/day";
import { isDayOffset } from "@/lib/pendientes/types";
import { filterContextEventsForUniverse } from "@/lib/babel/universe-refs";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { parseIsoDateParam } from "@/lib/temporal/ranges";
import { mapContextEvent } from "@/lib/events/mappers";
import { prisma } from "@/lib/prisma";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const dayParam = request.nextUrl.searchParams.get("day");
    const fromParam = request.nextUrl.searchParams.get("from");
    const toParam = request.nextUrl.searchParams.get("to");
    const universeSlug = getUniverseFilterSlugFromRequest(request);
    let start: Date;
    let end: Date;

    if (fromParam || toParam) {
      const parsedFrom = parseIsoDateParam(fromParam);
      const parsedTo = parseIsoDateParam(toParam);
      if (!parsedFrom || !parsedTo || parsedFrom >= parsedTo) {
        return NextResponse.json({ error: "Rango inválido." }, { status: 400 });
      }
      start = parsedFrom;
      end = parsedTo;
    } else {
      const safeDay = dayParam ?? "today";
      if (!isDayOffset(safeDay)) {
        return NextResponse.json({ error: "Día inválido." }, { status: 400 });
      }
      const range = dayRangeForOffset(safeDay);
      start = range.start;
      end = range.end;
    }

    const events = await prisma.contextEvent.findMany({
      where: {
        occurredAt: { gte: start, lt: end },
        status: { not: "rejected" },
      },
      orderBy: { occurredAt: "asc" },
      take: 50,
    });

    const filtered = await filterContextEventsForUniverse(events, universeSlug);

    return NextResponse.json({
      day: dayParam ?? null,
      from: start.toISOString(),
      to: end.toISOString(),
      events: filtered.map(mapContextEvent),
      universe: universeSlug ?? "babel",
    });
  } catch (error) {
    console.error("Calendario GET error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo cargar el calendario.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
