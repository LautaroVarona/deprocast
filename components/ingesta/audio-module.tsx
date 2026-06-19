"use client";

import { UploadDropzone } from "@/components/upload-dropzone";
import { Badge } from "@/components/ui/badge";
import { fetchJson } from "@/lib/fetch-json";
import { AudioLinesIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type QueueStatus = {
  active: { id: string } | null;
  queuedCount: number;
};

export function AudioModule() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchJson<QueueStatus>("/api/process/status");
      setQueueStatus(data);
    } catch {
      // Indicador no crítico.
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const interval = setInterval(() => void loadStatus(), 5000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const queueLabel = queueStatus
    ? queueStatus.active
      ? `Esterilizando 1 audio · ${queueStatus.queuedCount} en cola`
      : queueStatus.queuedCount > 0
        ? `${queueStatus.queuedCount} en cola de esterilización`
        : "Cola de esterilización vacía"
    : "Consultando cola...";

  return (
    <section aria-label="Ingesta de audio" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
          <AudioLinesIcon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Audio de caminatas</h3>
          <p className="text-xs text-muted-foreground">
            Los .wav / .m4a entran a la cola de esterilización local (Whisper).
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            queueStatus?.active
              ? "border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300"
              : undefined
          }
        >
          {queueLabel}
        </Badge>
      </div>
      <UploadDropzone onUploaded={() => void loadStatus()} />
    </section>
  );
}
