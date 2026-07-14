import { getActiveAgentIds } from "@/lib/historial/queries";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const agentIds = await getActiveAgentIds(24);
    return NextResponse.json({ agentIds });
  } catch (error) {
    console.error("Historial active agents error:", error);
    return NextResponse.json({ agentIds: [] });
  }
}
