import {
  activityEntriesToCsv,
  activityEntriesToJson,
} from "@/lib/historial/export";
import { getAllActivityForExport } from "@/lib/historial/queries";
import type { ActivityCategory } from "@/lib/historial/types";
import { ACTIVITY_CATEGORIES } from "@/lib/historial/types";
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

    const { searchParams } = request.nextUrl;
    const format = searchParams.get("format") === "csv" ? "csv" : "json";
    const day = searchParams.get("day") ?? undefined;
    const category = parseCategory(searchParams.get("category"));
    const agentId = searchParams.get("agentId") ?? undefined;
    const daysParam = searchParams.get("days");
    const days = daysParam ? Number.parseInt(daysParam, 10) : 30;

    const entries = await getAllActivityForExport({
      day,
      category,
      agentId,
      days: Number.isFinite(days) ? days : 30,
    });

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const csv = activityEntriesToCsv(entries);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="historial-${timestamp}.csv"`,
        },
      });
    }

    const json = activityEntriesToJson(entries);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="historial-${timestamp}.json"`,
      },
    });
  } catch (error) {
    console.error("Historial export error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo exportar el historial.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
