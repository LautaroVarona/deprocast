import { BackupGuardError } from "@/lib/backup/guards";
import { restoreBackupFromZip } from "@/lib/backup/import";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CONFIRM_TOKEN = "RESTORE";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const confirm = formData.get("confirm");

    if (confirm !== CONFIRM_TOKEN) {
      return NextResponse.json(
        { error: "Falta confirmación destructiva (confirm=RESTORE)." },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo de copia." },
        { status: 400 },
      );
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".zip") && !lowerName.endsWith(".deprocast-backup.zip")) {
      return NextResponse.json(
        { error: "El archivo debe ser un .zip o .deprocast-backup.zip." },
        { status: 400 },
      );
    }

    const zipBuffer = Buffer.from(await file.arrayBuffer());
    const result = await restoreBackupFromZip(zipBuffer);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Backup import error:", error);

    if (error instanceof BackupGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo restaurar la copia de seguridad.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
