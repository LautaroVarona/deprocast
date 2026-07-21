import {
  buildBackupArchive,
  buildBackupFilename,
} from "@/lib/backup/export";
import { parseExportDomainIds } from "@/lib/backup/domains";
import { BackupGuardError } from "@/lib/backup/guards";
import { BACKUP_MIME } from "@/lib/backup/constants";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const partialExportBodySchema = z.object({
  domains: z.array(z.string()).min(1),
  browserPreferences: z.record(z.unknown()).optional(),
});

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

export async function POST(request: NextRequest) {
  try {
    const body = partialExportBodySchema.parse(await request.json());
    const domains = parseExportDomainIds(body.domains);

    const buffer = await buildBackupArchive({
      domains,
      browserPreferences: body.browserPreferences,
    });
    const filename = buildBackupFilename(domains);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": BACKUP_MIME,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Partial backup export error:", error);

    if (error instanceof BackupGuardError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Solicitud de exportación parcial inválida." },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar la copia parcial.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
