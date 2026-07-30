"use client";

import { UploadDropzone } from "@/components/upload-dropzone";
import { fetchJson } from "@/lib/fetch-json";
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
      ? `STT activo · ${queueStatus.queuedCount} en cola`
      : queueStatus.queuedCount > 0
        ? `${queueStatus.queuedCount} en cola molecular`
        : "Cola vacía"
    : "…";

  return (
    <section
      aria-label="Ingesta de audio"
      className="flex min-h-[70vh] flex-col gap-3"
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div>
          <p className="font-serif text-[11px] uppercase tracking-[0.22em] text-amber-500">
            [INGESTA · AUDIO · ALTAR]
          </p>
          <p className="font-mono text-[10px] text-legion-patina">
            Misivas → Oráculo → Senado · 6 estaciones
          </p>
        </div>
        <span className="border border-stone-700 bg-stone-900 px-2 py-1 font-mono text-[9px] text-legion-patina rounded-none">
          {queueLabel}
        </span>
      </div>

      <UploadDropzone
        variant="crisol"
        onUploaded={() => void loadStatus()}
      />
    </section>
  );
}
