import { exportGraphJson, exportGraphML } from "@/lib/kg/export";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get("format") ?? "json";

    if (format === "graphml") {
      const graphml = await exportGraphML();
      return new NextResponse(graphml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": 'attachment; filename="deprocast-kg.graphml"',
        },
      });
    }

    const json = await exportGraphJson();
    return new NextResponse(JSON.stringify(json, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="deprocast-kg.json"',
      },
    });
  } catch (error) {
    console.error("KG export error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo exportar el grafo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
