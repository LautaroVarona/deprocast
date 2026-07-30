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
      <div className="flex shrink-0 items-center justify-between gap-2 font-mono">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#FFB000]">
            [INGESTA · AUDIO · CRISOL]
          </p>
          <p className="text-[10px] text-zinc-500">
            Chunks → tmp/ → Deepgram · 6 estaciones
          </p>
        </div>
        <span className="border border-zinc-800 bg-zinc-950 px-2 py-1 text-[9px] text-zinc-400 rounded-none">
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
