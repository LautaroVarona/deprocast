import { approveTransaction } from "@/lib/finanzas/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const transaction = await approveTransaction(id);
    return NextResponse.json({ transaction });
  } catch (error) {
    console.error("Finanzas approve error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo aprobar la transacción.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
