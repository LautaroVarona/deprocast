import { getMagoMatrix } from "@/lib/mago/projection";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const matrix = await getMagoMatrix();
    return NextResponse.json(matrix);
  } catch (error) {
    console.error("Mago matrix error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la matriz del Mago.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
