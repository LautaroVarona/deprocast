import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeMemoriaReport } from "@/lib/memorias/analyze";

const bodySchema = z.object({
  ejercicioN: z.string().min(1),
  textoN: z.string().min(1),
  ejercicioN1: z.string().min(1).optional(),
  textoN1: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Cuerpo inválido. Se requiere ejercicioN y textoN." },
        { status: 400 },
      );
    }

    const result = analyzeMemoriaReport(parsed.data);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Memoria analyze error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo analizar la memoria.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
