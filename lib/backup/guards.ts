import { processingQueue } from "@/lib/processing-queue";

export class BackupGuardError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "BackupGuardError";
  }
}

/** Backup is supported wherever the Node runtime can read/write SQLite + data dirs. */
export function assertLocalBackupAllowed(): void {
  // Intentionally empty: deployed instances (Vercel, DEPROCAST_DATA_ROOT, etc.)
  // use writable paths from lib/runtime-paths and must support import/export.
}

export async function assertNoActiveProcessing(): Promise<void> {
  if (await processingQueue.hasActiveJobs()) {
    throw new BackupGuardError(
      "Hay procesamiento de audio en curso. Esperá a que termine (o pausalo) antes de exportar o importar. El reinicio de fábrica puede forzarse desde Respaldo.",
      409,
    );
  }
}
