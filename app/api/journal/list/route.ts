import {
  shouldFilterByUniverse,
} from "@/lib/babel/context-seal";
import { resolveUniverseJournalPaths } from "@/lib/babel/universe-refs";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { listJournalEntries } from "@/lib/journal/service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const year = Number.parseInt(searchParams.get("year") ?? "", 10);
    const month = Number.parseInt(searchParams.get("month") ?? "", 10);
    const query = searchParams.get("q") ?? undefined;
    const universeSlug = getUniverseFilterSlugFromRequest(request);

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Se requieren year y month válidos." },
        { status: 400 },
      );
    }

    const result = await listJournalEntries({ year, month, query });

    if (universeSlug && shouldFilterByUniverse(universeSlug)) {
      const allowedPaths = await resolveUniverseJournalPaths(universeSlug);
      result.entries = result.entries.filter((entry) =>
        allowedPaths.has(entry.relativePath),
      );
      result.daysWithEntries = [
        ...new Set(
          result.entries.map((entry) => {
            const day = Number.parseInt(entry.fechaRegistro.slice(8, 10), 10);
            return Number.isFinite(day) ? day : 0;
          }),
        ),
      ].filter((day) => day > 0);
    }

    return NextResponse.json({
      ...result,
      universe: universeSlug ?? "babel",
    });
  } catch (error) {
    console.error("Journal list error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo listar las entradas del diario.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
