import { getEntryById } from "@/lib/enciclopedia/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const entry = await getEntryById(id);

    if (!entry) {
      return NextResponse.json({ error: "Entrada no encontrada." }, { status: 404 });
    }

    const reports = await prisma.encyclopediaReport.findMany({
      where: { entryId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        comment: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      entry,
      reports: reports.map((report) => ({
        ...report,
        createdAt: report.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Enciclopedia entry error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo cargar la entrada.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
