import {
  buildBackupArchive,
  buildBackupFilename,
} from "@/lib/backup/export";
import { BackupGuardError } from "@/lib/backup/guards";
import { BACKUP_MIME } from "@/lib/backup/constants";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const buffer = await buildBackupArchive();
    const filename = buildBackupFilename();

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": BACKUP_MIME,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Backup export error:", error);

    if (error instanceof BackupGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar la copia de seguridad.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
