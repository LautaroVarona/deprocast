import { backfillActivityLog, backfillHealthRecords } from "@/lib/historial/backfill";
import { listActivityByDays, listActivityLogs } from "@/lib/historial/queries";
import type { ActivityCategory } from "@/lib/historial/types";
import { ACTIVITY_CATEGORIES } from "@/lib/historial/types";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { prisma } from "@/lib/prisma";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parseCategory(value: string | null): ActivityCategory | undefined {
  if (!value) return undefined;
  return ACTIVITY_CATEGORIES.includes(value as ActivityCategory)
    ? (value as ActivityCategory)
    : undefined;
}

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    void backfillHealthRecords().catch((error) => {
      console.error("Historial health backfill error:", error);
    });

    const { searchParams } = request.nextUrl;
    const day = searchParams.get("day") ?? undefined;
    const category = parseCategory(searchParams.get("category"));
    const agentId = searchParams.get("agentId") ?? undefined;
    const limitParam = searchParams.get("limit");
    const cursor = searchParams.get("cursor") ?? undefined;
    const grouped = searchParams.get("grouped") === "true";
    const daysParam = searchParams.get("days");
    const universeSlug = getUniverseFilterSlugFromRequest(request);

    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const days = daysParam ? Number.parseInt(daysParam, 10) : undefined;

    if (grouped) {
      const groups = await listActivityByDays({
        day,
        category,
        agentId,
        limit,
        days,
        universeSlug,
      });

      return NextResponse.json({ groups, universe: universeSlug ?? "babel" });
    }

    const result = await listActivityLogs({
      day,
      category,
      agentId,
      limit,
      cursor,
      universeSlug,
    });

    return NextResponse.json({ ...result, universe: universeSlug ?? "babel" });
  } catch (error) {
    console.error("Historial GET error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo cargar el historial.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
    };

    if (body.action !== "backfill") {
      return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    }

    const existing = await prisma.activityLog.count();
    if (existing > 0) {
      return NextResponse.json({
        message: "Backfill omitido: ya hay registros.",
        created: 0,
        skipped: existing,
      });
    }

    const result = await backfillActivityLog();
    const healthResult = await backfillHealthRecords();
    return NextResponse.json({
      message: "Backfill completado.",
      ...result,
      health: healthResult,
    });
  } catch (error) {
    console.error("Historial POST error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo ejecutar el backfill.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
