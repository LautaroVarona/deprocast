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
            <MicIcon className="size-4 text-emerald-400/80" />
            <h2 className="font-mono text-sm font-medium text-white/90">
              Cola STT · Deepgram
            </h2>
          </div>
          <p className="font-mono text-[10px] text-white/45">
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
        <div className="rounded border border-white/10 bg-black/20 px-3 py-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-white/45">
            Pendientes STT
          </p>
          <p className="mt-1 font-mono text-lg text-white/90">{pendingCount}</p>
        </div>
        <div className="rounded border border-sky-500/20 bg-sky-500/5 px-3 py-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-sky-200/75">
            Cola activa
          </p>
          <p className="mt-1 font-mono text-lg text-sky-100">{queueDepth}</p>
        </div>
        <div className="rounded border border-violet-500/20 bg-violet-500/5 px-3 py-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-violet-200/75">
            Esperando purificar
          </p>
          <p className="mt-1 font-mono text-lg text-violet-100">{pendingPurifyCount}</p>
        </div>
      </div>

      {activeLabel ? (
        <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <p className="mb-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-emerald-200/80">
            <ActivityIcon className="size-3" />
            Procesando ahora
          </p>
          <p className="truncate font-mono text-[11px] text-emerald-100">{activeLabel}</p>
        </div>
      ) : (
        <div className="rounded border border-white/10 bg-black/20 px-3 py-2">
          <p className="flex items-center gap-1 font-mono text-[10px] text-white/45">
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
        <p className="rounded border border-violet-500/25 bg-violet-500/8 px-3 py-2 font-mono text-[10px] text-violet-200/90">
          {pendingPurifyCount} transcrito{pendingPurifyCount === 1 ? "" : "s"} sin
          enviar a Validar — revisá la pestaña Downstream o usá «Enviar a Validar».
        </p>
      ) : null}

      <div className="max-h-[460px] overflow-y-auto rounded border border-white/8 bg-black/30">
        {assets.length === 0 ? (
          <p className="py-8 text-center font-mono text-[10px] text-white/40">
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
                  className="rounded border border-white/8 bg-black/25 px-3 py-2.5 transition-colors hover:border-white/15"
                >
                  <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
                    <p className="truncate font-mono text-[11px] text-white/90">
                      {asset.filename}
                    </p>
                    <AudioPipelineBadge pipeline={pipeline} />
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">

                    {isQueued ? (
                      <span className="font-mono text-[9px] text-white/40">
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
          "font-mono text-[9px]",
          pendingCount > 0 ? "text-sky-300/70" : "text-white/30",
        )}
      >
        {pendingCount > 0
          ? `${pendingCount} audio${pendingCount === 1 ? "" : "s"} listo${pendingCount === 1 ? "" : "s"} para STT.`
          : "Cola STT al día."}
      </p>
    </section>
  );
}
