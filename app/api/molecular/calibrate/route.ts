import { runMolecularCalibrator } from "@/lib/molecular-processing/calibrator";
import type { ParticulaMetadata } from "@/lib/molecular-processing/types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const particulaSchema = z.object({
  id: z.string().uuid(),
  textoFragmento: z.string().min(1),
  fuenteOrigen: z.string(),
  fechaIngesta: z.string(),
});

const bodySchema = z.object({
  particulas: z.array(particulaSchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await runMolecularCalibrator({
      particulas: body.particulas as ParticulaMetadata[],
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Molecular calibrate error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo ejecutar el calibrador molecular.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
