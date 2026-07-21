import { validateBackupZip } from "@/lib/backup/import";
import { BackupGuardError } from "@/lib/backup/guards";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

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
    const result = await validateBackupZip(zipBuffer);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Backup validate error:", error);

    if (error instanceof BackupGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo validar la copia de seguridad.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
