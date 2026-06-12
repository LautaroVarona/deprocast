import { addProgressEntry } from "@/lib/projects/service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { nota?: string };

    if (!body.nota?.trim()) {
      return NextResponse.json(
        { error: "La nota de progreso es obligatoria." },
        { status: 400 },
      );
    }

    const project = await addProgressEntry({
      projectId: id,
      nota: body.nota,
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Add progress error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo registrar la entrada de progreso.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
