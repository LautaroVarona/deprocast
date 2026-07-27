import {
  buildProsopografoPrompt,
  PROSOPOGRAFO_SCHEMA_VERSION,
} from "@/lib/personas/prosopografo/prompt";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    prompt: buildProsopografoPrompt(),
    schemaVersion: PROSOPOGRAFO_SCHEMA_VERSION,
    agentId: "prosopografo",
  });
}
