import { ImmutableCollisionError } from "@/lib/calendario/collision";
import { coagulateMissionCard } from "@/lib/calendario/coagulate";
import { coagulateInputSchema } from "@/lib/calendario/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = await request.json();
    const input = coagulateInputSchema.parse(body);
    const result = await coagulateMissionCard(input);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Calendario coagulate error:", error);
    if (error instanceof ImmutableCollisionError) {
      return NextResponse.json(
        {
          error: error.message,
          collision: { blockTitle: error.blockTitle, blockId: error.blockId },
        },
        { status: 409 },
      );
    }
    const message =
      error instanceof Error ? error.message : "No se pudo coagular la misión.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
