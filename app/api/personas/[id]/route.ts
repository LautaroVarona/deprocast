import { getPersonaByIdOrSlug } from "@/lib/personas/queries";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const persona = await getPersonaByIdOrSlug(id);

    if (!persona) {
      return NextResponse.json({ error: "Persona no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ persona });
  } catch (error) {
    console.error("Persona detail error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo obtener la ficha de la persona.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
