import { isVercelRuntime } from "@/lib/runtime-paths";
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

export function assertLocalBackupAllowed(): void {
  if (isVercelRuntime()) {
    throw new BackupGuardError(
      "La copia de seguridad solo está disponible en entorno local.",
      403,
    );
  }
}

export async function assertNoActiveProcessing(): Promise<void> {
  if (await processingQueue.hasActiveJobs()) {
    throw new BackupGuardError(
      "Hay procesamiento de audio en curso. Esperá a que termine antes de exportar o importar.",
      409,
    );
  }
}
