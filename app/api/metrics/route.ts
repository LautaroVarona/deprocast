import { countProjectFiles } from "@/lib/projects/service";
import { prisma } from "@/lib/prisma";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RAW_DOCUMENTS_PENDING_DIR = path.join(
  process.cwd(),
  "data",
  "raw_documents",
  "pending",
);

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
      // Aún no hay persistencia de FocusSession; valor stub hasta Focus Work.
      signalPoints: 0,
    });
  } catch (error) {
    console.error("Metrics error:", error);
    return NextResponse.json(
      { error: "No se pudieron calcular las métricas." },
      { status: 500 },
    );
  }
}
