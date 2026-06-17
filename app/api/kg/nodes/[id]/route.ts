import { getNeighborhood, getNodeById } from "@/lib/kg/queries";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const neighborhood = await getNeighborhood(id);

    if (!neighborhood) {
      const node = await getNodeById(id);
      if (!node) {
        return NextResponse.json({ error: "Nodo no encontrado." }, { status: 404 });
      }

      return NextResponse.json({ node, edges: [], mentions: [] });
    }

    return NextResponse.json(neighborhood);
  } catch (error) {
    console.error("KG node detail error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo obtener el nodo del grafo.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
