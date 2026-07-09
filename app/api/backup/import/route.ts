import { parseExportDomainIds } from "@/lib/backup/domains";
import { BackupGuardError } from "@/lib/backup/guards";
import { restoreBackupFromZip } from "@/lib/backup/import";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CONFIRM_FULL = "RESTORE";
const CONFIRM_PARTIAL = "RESTORE_PARTIAL";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const confirm = formData.get("confirm");
    const domainsRaw = formData.get("domains");

    if (confirm !== CONFIRM_FULL && confirm !== CONFIRM_PARTIAL) {
      return NextResponse.json(
        {
          error:
            "Falta confirmación destructiva (confirm=RESTORE o confirm=RESTORE_PARTIAL).",
        },
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

    let domains: ReturnType<typeof parseExportDomainIds> | undefined;
    if (confirm === CONFIRM_PARTIAL) {
      if (typeof domainsRaw !== "string" || domainsRaw.trim().length === 0) {
        return NextResponse.json(
          { error: "La restauración parcial requiere el campo domains." },
          { status: 400 },
        );
      }

      try {
        domains = parseExportDomainIds(JSON.parse(domainsRaw) as unknown);
      } catch {
        return NextResponse.json(
          { error: "El campo domains no es válido." },
          { status: 400 },
        );
      }
    }

    const result = await restoreBackupFromZip(zipBuffer, { domains });

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
