import {
  createHealthRecord,
  deleteHealthRecord,
  listHealthRecords,
} from "@/lib/health/service";
import { isHealthPillar } from "@/lib/events/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const { searchParams } = request.nextUrl;
    const pillar = searchParams.get("pillar");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = searchParams.get("limit");

    if (pillar && !isHealthPillar(pillar)) {
      return NextResponse.json({ error: "Pilar inválido." }, { status: 400 });
    }

    const records = await listHealthRecords({
      pillar: pillar && isHealthPillar(pillar) ? pillar : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error("Health records list error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron listar los registros de salud.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as {
      pillar?: string;
      occurredAt?: string;
      summary?: string;
      metrics?: Record<string, unknown>;
    };

    if (!body.pillar || !isHealthPillar(body.pillar)) {
      return NextResponse.json({ error: "Pilar inválido." }, { status: 400 });
    }

    const summary = body.summary?.trim() ?? "";
    if (!summary) {
      return NextResponse.json(
        { error: "El resumen es obligatorio." },
        { status: 400 },
      );
    }

    const result = await createHealthRecord({
      pillar: body.pillar,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
      summary,
      metrics: body.metrics ?? {},
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Health record create error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear el registro de salud.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requerido." }, { status: 400 });
    }

    await deleteHealthRecord(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Health record delete error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar el registro.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
