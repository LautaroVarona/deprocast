import { submitReport } from "@/lib/enciclopedia/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const reportTypes = ["validate", "inaccuracy", "missing", "other"] as const;

const bodySchema = z.object({
  entryId: z.string().uuid(),
  type: z.enum(reportTypes),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = bodySchema.parse(await request.json());
    const entry = await submitReport(body);

    return NextResponse.json({ ok: true, entry }, { status: 201 });
  } catch (error) {
    console.error("Enciclopedia report error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error ? error.message : "No se pudo registrar el reporte.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
