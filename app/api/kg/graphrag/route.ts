import {
  runGraphRagSearch,
  type GraphRagImpactZone,
} from "@/lib/kg/graphrag";
import {
  coagulateKgEdge,
  rejectSuggestedEdge,
} from "@/lib/kg/quantomo-gravity";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/kg/graphrag
 * body: { query: string } → Zona de Impacto
 * body: { action: "coagulate"|"reject", edgeId: string } → HITL
 */
export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = (await request.json()) as {
      query?: string;
      action?: "coagulate" | "reject" | "search";
      edgeId?: string;
      coreLimit?: number;
    };

    if (body.action === "coagulate") {
      if (!body.edgeId?.trim()) {
        return NextResponse.json(
          { error: "Se requiere edgeId para coagular." },
          { status: 400 },
        );
      }
      const result = await coagulateKgEdge(body.edgeId.trim());
      if (!result) {
        return NextResponse.json(
          { error: "Arista no encontrada." },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, edge: result });
    }

    if (body.action === "reject") {
      if (!body.edgeId?.trim()) {
        return NextResponse.json(
          { error: "Se requiere edgeId para rechazar." },
          { status: 400 },
        );
      }
      const ok = await rejectSuggestedEdge(body.edgeId.trim());
      if (!ok) {
        return NextResponse.json(
          { error: "No se pudo rechazar (inexistente o ya coagulada)." },
          { status: 400 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    const query = body.query?.trim() ?? "";
    if (!query) {
      return NextResponse.json(
        { error: "Se requiere query." },
        { status: 400 },
      );
    }

    const zone: GraphRagImpactZone = await runGraphRagSearch(query, {
      coreLimit: body.coreLimit,
    });

    return NextResponse.json(zone);
  } catch (error) {
    console.error("GraphRAG error:", error);
    const message =
      error instanceof Error ? error.message : "Fallo en el motor GraphRAG.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
