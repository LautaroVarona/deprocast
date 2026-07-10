import {
  discoverUniverse,
  listUniverses,
} from "@/lib/babel/universe-store";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const universos = await listUniverses();
    return NextResponse.json({ universos });
  } catch (error) {
    console.error("Universos GET error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron listar universos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as {
      label?: string;
      description?: string;
    };

    if (!body.label?.trim()) {
      return NextResponse.json(
        { error: "El nombre del Universo es obligatorio." },
        { status: 400 },
      );
    }

    const universo = await discoverUniverse({
      label: body.label,
      description: body.description,
    });

    return NextResponse.json({ universo }, { status: 201 });
  } catch (error) {
    console.error("Universos POST error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo descubrir el universo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
