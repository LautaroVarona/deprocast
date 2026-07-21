"use client";

import { useAudioStation } from "@/components/audio-station/audio-station-context";
import {
  AudioPipelineBadge,
  AudioPipelineNextAction,
} from "@/components/audio-station/audio-pipeline-badge";
import { LiveProcessingPanel } from "@/components/live-processing-panel";
import { ProcessAllButton } from "@/components/process-all-button";
import { ProcessButton } from "@/components/process-button";
import { StopProcessButton } from "@/components/stop-process-button";
import { StatusBadge } from "@/components/status-badge";
import { ViewDetailsLink } from "@/components/view-details-link";
import { DownloadTranscriptButton } from "@/components/download-transcript-button";
import { resolveAudioPipelineStage } from "@/lib/audio-station/pipeline-status";
import { cn } from "@/lib/utils";
import { MicIcon, ActivityIcon, CircleDashedIcon } from "lucide-react";
import { useMemo } from "react";

export function SttQueuePanel() {
  const { assets, queueStatus, reviewByAssetId, refresh, refreshKey } =
    useAudioStation();

  const queuedIds = new Set(queueStatus?.queuedIds ?? []);
  const activeId = queueStatus?.active?.id ?? null;

  const pendingCount = assets.filter(
    (asset) =>
      (asset.status === "PENDING" || asset.status === "ERROR") &&
      !queuedIds.has(asset.id) &&
      asset.id !== activeId,
  ).length;

  function getDisplayStatus(asset: (typeof assets)[number]) {
    if (asset.status === "PROCESSING" || asset.id === activeId) {
      return "PROCESSING";
    }

    if (
      (asset.status === "PENDING" || asset.status === "ERROR") &&
      queuedIds.has(asset.id)
    ) {
      return "QUEUED";
    }

    return asset.status;
  }

  const pendingPurifyCount = useMemo(
    () =>
      assets.filter(
        (asset) =>
          resolveAudioPipelineStage(asset, {
            queuedIds,
            activeId,
            reviewByAssetId,
          }).stage === "pending_purify",
      ).length,
    [assets, queuedIds, activeId, reviewByAssetId],
  );

  const queueDepth = queueStatus?.queuedIds?.length ?? 0;
  const activeLabel = queueStatus?.active
    ? assets.find((asset) => asset.id === queueStatus.active?.id)?.filename ?? null
    : null;

  return (
    <section className="audio-noir-panel space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MicIcon className="size-4 text-primary/80" />
            <h2 className="font-mono text-sm font-medium text-muted-foreground">
              Cola STT · Deepgram
            </h2>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">
            Conversión FFmpeg → transcripción sincrónica o por chunks según
            duración. Extrae texto crudo, confianza y texto parcial ante fallos.
          </p>
        </div>

        <ProcessAllButton
          pendingCount={pendingCount}
          onQueued={() => void refresh()}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded border border-border bg-muted/40 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Pendientes STT
          </p>
          <p className="mt-1 font-mono text-lg text-muted-foreground">{pendingCount}</p>
        </div>
        <div className="rounded border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary/75">
            Cola activa
          </p>
          <p className="mt-1 font-mono text-lg text-primary">{queueDepth}</p>
        </div>
        <div className="rounded border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary/75">
            Esperando purificar
          </p>
          <p className="mt-1 font-mono text-lg text-foreground">{pendingPurifyCount}</p>
        </div>
      </div>

      {activeLabel ? (
        <div className="rounded border border-primary/30 bg-primary/10 px-3 py-2">
          <p className="mb-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary/80">
            <ActivityIcon className="size-3" />
            Procesando ahora
          </p>
          <p className="truncate font-mono text-[11px] text-primary">{activeLabel}</p>
        </div>
      ) : (
        <div className="rounded border border-border bg-muted/40 px-3 py-2">
          <p className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
            <CircleDashedIcon className="size-3" />
            Sin proceso activo
          </p>
        </div>
      )}

      <LiveProcessingPanel
        refreshKey={refreshKey}
        onStopped={() => void refresh()}
        onQueueIdle={() => void refresh()}
      />

      {pendingPurifyCount > 0 ? (
        <p className="rounded border border-primary/25 bg-primary/8 px-3 py-2 font-mono text-[10px] text-primary/90">
          {pendingPurifyCount} transcrito{pendingPurifyCount === 1 ? "" : "s"} sin
          enviar a Validar — revisá la pestaña Downstream o usá «Enviar a Validar».
        </p>
      ) : null}

      <div className="max-h-[460px] overflow-y-auto rounded border border-border bg-muted/40">
        {assets.length === 0 ? (
          <p className="py-8 text-center font-mono text-[10px] text-muted-foreground">
            Subí audios en la biblioteca para encolar STT.
          </p>
        ) : (
          <ul className="space-y-2 p-2">
            {assets.map((asset) => {
              const displayStatus = getDisplayStatus(asset);
              const isQueued = displayStatus === "QUEUED";
              const pipeline = resolveAudioPipelineStage(asset, {
                queuedIds,
                activeId,
                reviewByAssetId,
              });

              return (
                <li
                  key={asset.id}
                  className="rounded border border-border bg-card/80 px-3 py-2.5 transition-colors hover:border-border"
                >
                  <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {asset.filename}
                    </p>
                    <AudioPipelineBadge pipeline={pipeline} />
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">

                    {isQueued ? (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        En cola
                      </span>
                    ) : (
                      <StatusBadge status={displayStatus} />
                    )}

                    {(asset.status === "PENDING" || asset.status === "ERROR") &&
                      !isQueued &&
                      asset.id !== activeId && (
                        <ProcessButton
                          assetId={asset.id}
                          onProcessed={() => void refresh()}
                        />
                      )}

                    {displayStatus === "PROCESSING" && (
                      <>
                        <ViewDetailsLink
                          assetId={asset.id}
                          label="En vivo"
                        />
                        <StopProcessButton
                          assetId={asset.id}
                          onStopped={() => void refresh()}
                        />
                      </>
                    )}

                    {asset.transcript && (
                      <>
                        <ViewDetailsLink assetId={asset.id} />
                        <DownloadTranscriptButton
                          assetId={asset.id}
                          label=".md"
                          size="sm"
                        />
                        <AudioPipelineNextAction
                          pipeline={pipeline}
                          assetId={asset.id}
                          filename={asset.filename}
                          onPurified={() => void refresh()}
                        />
                      </>
                    )}

                    {isQueued && (
                      <StopProcessButton
                        assetId={asset.id}
                        label="Sacar"
                        onStopped={() => void refresh()}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p
        className={cn(
          "font-mono text-[10px]",
          pendingCount > 0 ? "text-primary/70" : "text-muted-foreground",
        )}
      >
        {pendingCount > 0
          ? `${pendingCount} audio${pendingCount === 1 ? "" : "s"} listo${pendingCount === 1 ? "" : "s"} para STT.`
          : "Cola STT al día."}
      </p>
    </section>
  );
}
