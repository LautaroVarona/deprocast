import { listArchivoItems } from "@/lib/archivo";
import type { ArchivoKind } from "@/lib/archivo";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const kind = request.nextUrl.searchParams.get("kind");
    const force = request.nextUrl.searchParams.get("refresh") === "1";

    const result = await listArchivoItems({
      kind: kind as ArchivoKind | undefined,
      force,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Archivo list error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
