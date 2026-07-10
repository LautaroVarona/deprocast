import { dayRangeForOffset } from "@/lib/pendientes/day";
import { isDayOffset } from "@/lib/pendientes/types";
import { mapContextEvent } from "@/lib/events/mappers";
import { prisma } from "@/lib/prisma";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const dayParam = request.nextUrl.searchParams.get("day") ?? "today";
    if (!isDayOffset(dayParam)) {
      return NextResponse.json({ error: "Día inválido." }, { status: 400 });
    }

    const { start, end } = dayRangeForOffset(dayParam);

    const events = await prisma.contextEvent.findMany({
      where: {
        occurredAt: { gte: start, lt: end },
        status: { not: "rejected" },
      },
      orderBy: { occurredAt: "asc" },
      take: 20,
    });

    return NextResponse.json({
      day: dayParam,
      events: events.map(mapContextEvent),
    });
  } catch (error) {
    console.error("Calendario GET error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo cargar el calendario.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
