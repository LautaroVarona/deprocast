import { getCapital, updateCapital } from "@/lib/finanzas/service";
import { capitalUpdateSchema } from "@/lib/finanzas/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const capital = await getCapital();
    return NextResponse.json({ capital });
  } catch (error) {
    console.error("Finanzas capital get error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el capital." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = await request.json();
    const input = capitalUpdateSchema.parse(body);
    const capital = await updateCapital(input);
    return NextResponse.json({ capital });
  } catch (error) {
    console.error("Finanzas capital put error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el capital.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
