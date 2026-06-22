import { listEventsByEntity } from "@/lib/events/service";
import { listHealthRecords } from "@/lib/health/service";
import { isEventPillar, isHealthPillar } from "@/lib/events/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get("projectId");
    const pillar = searchParams.get("pillar");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const healthPillar =
      pillar && isHealthPillar(pillar) ? pillar : undefined;

    const [healthRecords, projectEvents] = await Promise.all([
      listHealthRecords({ pillar: healthPillar, from: fromDate, to: toDate }),
      projectId
        ? listEventsByEntity("proyecto", projectId, {
            from: fromDate,
            to: toDate,
            status: "confirmed",
          })
        : Promise.resolve([]),
    ]);

    const healthEvents = projectId
      ? await listEventsByEntity("health_pillar", healthPillar ?? "recuperacion", {
          from: fromDate,
          to: toDate,
          status: "confirmed",
        })
      : [];

    const timeline = [
      ...healthRecords.map((r) => ({
        type: "health_record" as const,
        occurredAt: r.occurredAt,
        pillar: r.pillar,
        label: r.summary,
        data: r,
      })),
      ...projectEvents.map((e) => ({
        type: "context_event" as const,
        occurredAt: e.occurredAt,
        pillar: e.pillar,
        label: e.content,
        data: e,
      })),
    ].sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

    const byPillar = timeline.reduce<Record<string, number>>((acc, item) => {
      const key = item.pillar;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      timeline,
      byPillar,
      healthRecordCount: healthRecords.length,
      projectEventCount: projectEvents.length,
      correlatedHealthEvents: healthEvents.length,
      filters: {
        projectId,
        pillar: pillar && isEventPillar(pillar) ? pillar : null,
        from,
        to,
      },
    });
  } catch (error) {
    console.error("Events correlate error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo calcular la correlación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
