import {
  confirmEvent,
  confirmEvents,
  getEventById,
  rejectEvent,
} from "@/lib/events/service";
import { rescheduleTemporalEvent } from "@/lib/temporal/mutations";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const event = await getEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch (error) {
    console.error("Event get error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo obtener el evento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      eventIds?: string[];
    };

    if (body.action === "confirm_batch" && Array.isArray(body.eventIds)) {
      const events = await confirmEvents(body.eventIds);
      return NextResponse.json({ events });
    }

    const event = await confirmEvent(id);
    return NextResponse.json({ event });
  } catch (error) {
    console.error("Event confirm error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo confirmar el evento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const event = await rejectEvent(id);
    return NextResponse.json({ event });
  } catch (error) {
    console.error("Event reject error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo rechazar el evento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { occurredAt?: string };
    if (!body.occurredAt) {
      return NextResponse.json({ error: "occurredAt es obligatorio." }, { status: 400 });
    }
    const occurredAt = new Date(body.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      return NextResponse.json({ error: "occurredAt inválido." }, { status: 400 });
    }
    const event = await rescheduleTemporalEvent(id, occurredAt);
    return NextResponse.json({ event });
  } catch (error) {
    console.error("Event patch error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo reprogramar el evento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
