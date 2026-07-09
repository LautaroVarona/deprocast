import { getDomainPreviewStats } from "@/lib/backup/preview";
import { BackupGuardError } from "@/lib/backup/guards";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const domains = await getDomainPreviewStats();
    return NextResponse.json({ domains });
  } catch (error) {
    console.error("Backup preview error:", error);

    if (error instanceof BackupGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo obtener la vista previa de exportación.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
