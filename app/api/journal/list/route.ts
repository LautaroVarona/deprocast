import { getJournalEntry, listJournalEntries } from "@/lib/journal/service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const year = Number.parseInt(searchParams.get("year") ?? "", 10);
    const month = Number.parseInt(searchParams.get("month") ?? "", 10);
    const query = searchParams.get("q") ?? undefined;

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Se requieren year y month válidos." },
        { status: 400 },
      );
    }

    const result = await listJournalEntries({ year, month, query });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Journal list error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo listar las entradas del diario.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
