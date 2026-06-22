import { archiveProposal } from "@/lib/projects/proposal-store";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const proposal = await archiveProposal(id);
    return NextResponse.json({ proposal });
  } catch (error) {
    console.error("Archive proposal error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo archivar la propuesta.";
    const status = message.includes("no encontrada") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
