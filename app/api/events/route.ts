import {
  listEventsByEntity,
  listEventsBySource,
  listProposedEventsByCorrelation,
} from "@/lib/events/service";
import { isEventSource } from "@/lib/events/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const { searchParams } = request.nextUrl;
    const source = searchParams.get("source");
    const sourceRef = searchParams.get("sourceRef");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const correlationId = searchParams.get("correlationId");
    const status = searchParams.get("status") ?? undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (correlationId) {
      const events = await listProposedEventsByCorrelation(correlationId);
      return NextResponse.json({ events });
    }

    if (source && sourceRef) {
      if (!isEventSource(source)) {
        return NextResponse.json({ error: "Source inválido." }, { status: 400 });
      }
      const events = await listEventsBySource(source, sourceRef, status);
      return NextResponse.json({ events });
    }

    if (entityType && entityId) {
      const events = await listEventsByEntity(entityType, entityId, {
        status,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      });
      return NextResponse.json({ events });
    }

    return NextResponse.json(
      { error: "Parámetros insuficientes: source+sourceRef, entityType+entityId o correlationId." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Events list error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron listar eventos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
