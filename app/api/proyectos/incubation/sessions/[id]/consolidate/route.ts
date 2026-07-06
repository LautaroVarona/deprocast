import { consolidateIncubation } from "@/lib/projects/incubation/consolidate";
import { incubationExtractionSchema } from "@/lib/projects/incubation/schema";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const body = (await request.json()) as {
      extractionOverrides?: unknown;
    };

    let overrides;
    if (body.extractionOverrides !== undefined) {
      const parsed = incubationExtractionSchema.partial().safeParse(
        body.extractionOverrides,
      );
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Los overrides de extracción no son válidos." },
          { status: 400 },
        );
      }
      overrides = parsed.data;
    }

    const project = await consolidateIncubation(id, overrides);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Incubation consolidate error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo consolidar el proyecto.";
    const status = message.includes("no encontrada") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
