"use client";

import { PauseQueueButton } from "@/components/pause-queue-button";
import { StatusBadge } from "@/components/status-badge";
import { StopProcessButton } from "@/components/stop-process-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2Icon, PauseIcon } from "lucide-react";
import { fetchJson } from "@/lib/fetch-json";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ProcessStatus = {
  active: {
    id: string;
    filename: string;
    partialText: string | null;
    status: string;
  } | null;
  queuedIds: string[];
  queuedCount: number;
  paused?: boolean;
};

type LiveProcessingPanelProps = {
  refreshKey: number;
  onStopped?: () => void;
  onQueueIdle?: () => void;
  /** Si true, el asset activo no pertenece al universo filtrado en la UI. */
  outsideUniverse?: boolean;
};

export function LiveProcessingPanel({
  refreshKey,
  onStopped,
  onQueueIdle,
  outsideUniverse = false,
}: LiveProcessingPanelProps) {
  const [status, setStatus] = useState<ProcessStatus | null>(null);
  const transcriptRef = useRef<HTMLPreElement>(null);
  const wasActiveRef = useRef(false);
  const pollFailureCountRef = useRef(0);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchJson<ProcessStatus>("/api/process/status");
      pollFailureCountRef.current = 0;
      setStatus(data);
    } catch (error) {
      pollFailureCountRef.current += 1;

      // Durante transcripciones largas, el dev server puede devolver fallos
      // transitorios (p. ej. recompilación/hot reload). Evitamos ruido en consola.
      if (pollFailureCountRef.current >= 3) {
        console.warn("No se pudo actualizar el estado de procesamiento:", error);
      }
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus, refreshKey]);

  const isPaused = status?.paused === true;
  const isActive =
    status?.active?.status === "PROCESSING" ||
    (status?.queuedCount ?? 0) > 0 ||
    isPaused;

  useEffect(() => {
    if (isActive) {
      wasActiveRef.current = true;
      return;
    }

    if (wasActiveRef.current) {
      wasActiveRef.current = false;
      onQueueIdle?.();
      toast.success("Transcripción completada", {
        description:
          "El audio se está purificando automáticamente. En unos segundos aparecerá en Validar.",
        action: {
          label: "Validar →",
          onClick: () => {
            window.location.href = "/validar";
          },
        },
      });
    }
  }, [isActive, onQueueIdle]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const interval = setInterval(() => {
      void loadStatus();
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, loadStatus]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [status?.active?.partialText]);

  if (
    !status ||
    (!status.active && status.queuedCount === 0 && !status.paused)
  ) {
    return null;
  }

  const waitingCount = status.queuedCount;

  return (
    <Card
      className={
        isPaused
          ? "border-amber-500/40 bg-amber-500/8"
          : "border-amber-500/30 bg-amber-500/5"
      }
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              {isPaused ? (
                <PauseIcon className="size-5 text-amber-600" />
              ) : (
                <Loader2Icon className="size-5 animate-spin text-amber-600" />
              )}
              {isPaused ? "STT pausado" : "Procesamiento en vivo"}
            </CardTitle>
            <CardDescription>
              {isPaused
                ? "No se envían más segmentos a Deepgram. El segmento en vuelo puede terminar."
                : "Los audios se procesan uno a uno. La transcripción aparece en tiempo real."}
              {waitingCount > 0 && ` · ${waitingCount} en cola`}
            </CardDescription>
          </div>
          <PauseQueueButton
            paused={isPaused}
            onToggled={() => void loadStatus()}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {outsideUniverse ? (
          <p className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-[11px] text-amber-800 dark:text-amber-200">
            Este audio no está en el universo activo: la biblioteca puede verse
            vacía, pero Deepgram sigue (o seguía) trabajando en background.
          </p>
        ) : null}

        {status.active ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/audio/${status.active.id}`}
                className="font-medium hover:underline"
              >
                {status.active.filename}
              </Link>
              <StatusBadge status={status.active.status} />
              <StopProcessButton
                assetId={status.active.id}
                onStopped={() => {
                  void loadStatus();
                  onStopped?.();
                }}
              />
            </div>
            <pre
              ref={transcriptRef}
              className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border bg-background p-4 text-sm leading-relaxed"
            >
              {isPaused && !status.active.partialText?.trim()
                ? "Pausado — esperando reanudación antes del próximo segmento..."
                : status.active.partialText?.trim() ||
                  (isPaused
                    ? "Pausado entre segmentos..."
                    : "Escuchando audio, esperando primeros segmentos...")}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isPaused
              ? "Cola pausada. Reanudá para seguir con los PENDING."
              : "Preparando el siguiente audio en la cola..."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
