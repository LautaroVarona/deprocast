import { assignAmazonAToCalendar } from "@/lib/amazona/store";
import { assignAmazonAToEventSchema } from "@/lib/amazona/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = await request.json();
    const parsed = assignAmazonAToEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }

    const result = await assignAmazonAToCalendar(parsed.data);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    console.error("AmazonA assign error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo asignar el recurso al calendario.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
