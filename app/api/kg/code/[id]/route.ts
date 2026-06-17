import { getCodeDependencies } from "@/lib/kg/analytics";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await getCodeDependencies(id);

    if (!result.node) {
      return NextResponse.json(
        { error: "Nodo de codigo no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("KG code dependencies error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron obtener las dependencias.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
