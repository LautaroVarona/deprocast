import {
  createMagoColeccion,
  listMagoColecciones,
} from "@/lib/mago/store";
import type { MagoColeccionKind } from "@/lib/mago/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const colecciones = await listMagoColecciones();
    return NextResponse.json({ colecciones });
  } catch (error) {
    console.error("Mago colecciones list error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron listar las colecciones.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureRuntimeReady();
    const body = (await request.json()) as {
      nombre?: string;
      descripcion?: string;
      kind?: MagoColeccionKind;
      seedSlots?: boolean;
    };

    if (!body.nombre?.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio." },
        { status: 400 },
      );
    }

    const coleccion = await createMagoColeccion({
      nombre: body.nombre,
      descripcion: body.descripcion,
      kind: body.kind,
      seedSlots: body.seedSlots,
    });

    return NextResponse.json({ coleccion }, { status: 201 });
  } catch (error) {
    console.error("Mago coleccion create error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear la colección.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
