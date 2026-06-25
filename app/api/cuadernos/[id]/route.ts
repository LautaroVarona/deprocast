import { getNotebookById } from "@/lib/cuadernos/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const notebook = await getNotebookById(id);

    if (!notebook) {
      return NextResponse.json({ error: "Cuaderno no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ notebook });
  } catch (error) {
    console.error("Cuaderno detail error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo cargar el cuaderno.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
