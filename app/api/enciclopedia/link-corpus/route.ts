import { linkEntryToCorpus } from "@/lib/enciclopedia/corpus-link";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  entryId: z.string().uuid(),
  targets: z
    .array(
      z.object({
        nodeId: z.string().uuid(),
        relationType: z.string().min(1),
        context: z.string().optional(),
      }),
    )
    .min(1),
});

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = bodySchema.parse(await request.json());
    const result = await linkEntryToCorpus(body);

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    console.error("Enciclopedia link-corpus error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error ? error.message : "No se pudo vincular al Corpus.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
