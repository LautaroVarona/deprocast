import { countProjectFiles } from "@/lib/projects/service";
import { prisma } from "@/lib/prisma";
import { getRawDocumentsPath } from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { readdir } from "node:fs/promises";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RAW_DOCUMENTS_PENDING_DIR = getRawDocumentsPath("pending");

async function countMarkdownFiles(dir: string): Promise<number> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .length;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    await ensureRuntimeReady();

    const [
      completedAudios,
      pendingAudios,
      processingAudios,
      pendingDocuments,
      pendingProjects,
    ] = await Promise.all([
      prisma.audioAsset.count({ where: { status: "COMPLETED" } }),
      prisma.audioAsset.count({ where: { status: "PENDING" } }),
      prisma.audioAsset.count({ where: { status: "PROCESSING" } }),
      countMarkdownFiles(RAW_DOCUMENTS_PENDING_DIR),
      countProjectFiles(),
    ]);

    return NextResponse.json({
      pureSignal: completedAudios,
      pendingRawMatter: pendingAudios + processingAudios + pendingDocuments,
      pendingAudios: pendingAudios + processingAudios,
      pendingDocuments,
      pendingProjects,
      signalPoints: 0,
    });
  } catch (error) {
    console.error("Metrics error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron calcular las métricas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
