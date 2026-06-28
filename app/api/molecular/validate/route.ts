import { persistValidatedParticula } from "@/lib/molecular-processing/store";
import type { BloquePrioridad } from "@/lib/jornada/types";
import { BLOQUE_PRIORIDADES } from "@/lib/jornada/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bloqueSchema = z.enum(
  BLOQUE_PRIORIDADES as unknown as [string, ...string[]],
);

const calibracionPropuestaSchema = z.object({
  ejeX: bloqueSchema,
  ejeY: z.number().int().min(1).max(12),
  ejeZ: z.number().int().min(1).max(12),
  currencyPotencial: z.number(),
  confianza: z.number(),
  razonamiento: z.string(),
});

const bodySchema = z.object({
  particula: z.object({
    id: z.string().uuid(),
    textoFragmento: z.string(),
    fuenteOrigen: z.string(),
    fechaIngesta: z.string(),
    ejeX: bloqueSchema,
    ejeY: z.number().int().min(1).max(12),
    ejeZ: z.number().int().min(1).max(12),
    currencyPotencial: z.number().optional(),
    propuestaOriginal: calibracionPropuestaSchema,
  }),
});

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = bodySchema.parse(await request.json());
    const saved = await persistValidatedParticula({
      particula: {
        ...body.particula,
        ejeX: body.particula.ejeX as BloquePrioridad,
        propuestaOriginal: {
          ...body.particula.propuestaOriginal,
          ejeX: body.particula.propuestaOriginal.ejeX as BloquePrioridad,
        },
      },
    });

    return NextResponse.json({ ok: true, particula: saved }, { status: 201 });
  } catch (error) {
    console.error("Molecular validate error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo persistir la partícula validada.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureRuntimeReady();
    const { listValidatedParticulas } = await import(
      "@/lib/molecular-processing/store"
    );
    const particulas = await listValidatedParticulas();
    return NextResponse.json({ particulas, total: particulas.length });
  } catch (error) {
    console.error("Molecular validate list error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo listar partículas validadas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
