import { getJournalEntry } from "@/lib/journal/service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const entry = await getJournalEntry(decodeURIComponent(id));

    if (!entry) {
      return NextResponse.json(
        { error: "Entrada de diario no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Journal detail error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la entrada del diario.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
