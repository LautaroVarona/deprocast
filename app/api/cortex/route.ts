import {
  resolveContextSealFromRequest,
  shouldFilterByUniverse,
} from "@/lib/babel/context-seal";
import { getCortexSnapshot } from "@/lib/cortex/queries";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const universeSlug = resolveContextSealFromRequest(request);
    const snapshot = await getCortexSnapshot({
      universeSlug: shouldFilterByUniverse(universeSlug)
        ? universeSlug
        : undefined,
    });
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
