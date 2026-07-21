import { approveAllPending } from "@/lib/finanzas/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    await ensureRuntimeReady();
    const transactions = await approveAllPending();
    return NextResponse.json({ transactions, count: transactions.length });
  } catch (error) {
    console.error("Finanzas approve-all error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron aprobar las transacciones.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
