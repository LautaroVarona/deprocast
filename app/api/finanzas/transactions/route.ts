import { listTransactions } from "@/lib/finanzas/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const transactions = await listTransactions(status);
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Finanzas transactions list error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las transacciones." },
      { status: 500 },
    );
  }
}
