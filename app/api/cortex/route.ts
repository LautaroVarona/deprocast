import { getCortexSnapshot } from "@/lib/cortex/queries";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const snapshot = await getCortexSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Cortex snapshot error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el estado del Córtex.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
