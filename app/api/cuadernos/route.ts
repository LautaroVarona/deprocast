import {
  createNotebook,
  listNotebooks,
} from "@/lib/cuadernos/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const notebooks = await listNotebooks();
    return NextResponse.json({ notebooks });
  } catch (error) {
    console.error("Cuadernos list error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron listar los cuadernos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = (await request.json()) as {
      title?: string;
      description?: string;
    };

    const notebook = await createNotebook({
      title: body.title ?? "",
      description: body.description,
    });

    return NextResponse.json({ notebook }, { status: 201 });
  } catch (error) {
    console.error("Cuaderno create error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear el cuaderno.";
    const status = message.includes("obligatorio") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
