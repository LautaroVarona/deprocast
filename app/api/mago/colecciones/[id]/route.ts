import { getMagoColeccion } from "@/lib/mago/store";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const coleccion = await getMagoColeccion(id);
    if (!coleccion) {
      return NextResponse.json(
        { error: "Colección no encontrada." },
        { status: 404 },
      );
    }
    return NextResponse.json({ coleccion });
  } catch (error) {
    console.error("Mago coleccion get error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la colección.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
