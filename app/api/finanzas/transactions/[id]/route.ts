import {
  approveTransaction,
  rejectTransaction,
  updateTransaction,
} from "@/lib/finanzas/service";
import { transactionUpdateSchema } from "@/lib/finanzas/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const body = await request.json();
    const patch = transactionUpdateSchema.parse(body);
    const transaction = await updateTransaction(id, patch);
    return NextResponse.json({ transaction });
  } catch (error) {
    console.error("Finanzas transaction patch error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar la transacción.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
