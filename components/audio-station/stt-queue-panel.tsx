"use client";

import { useAudioStation } from "@/components/audio-station/audio-station-context";
import { LiveProcessingPanel } from "@/components/live-processing-panel";
import { ProcessAllButton } from "@/components/process-all-button";
import { ProcessButton } from "@/components/process-button";
import { StopProcessButton } from "@/components/stop-process-button";
import { StatusBadge } from "@/components/status-badge";
import { ViewDetailsLink } from "@/components/view-details-link";
import { DownloadTranscriptButton } from "@/components/download-transcript-button";
import { cn } from "@/lib/utils";
import { MicIcon } from "lucide-react";

export function SttQueuePanel() {
  const { assets, queueStatus, refresh, refreshKey } = useAudioStation();

  const queuedIds = new Set(queueStatus?.queuedIds ?? []);
  const activeId = queueStatus?.active?.id;

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

  return (
    <section className="audio-noir-panel space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MicIcon className="size-4 text-emerald-400/80" />
            <h2 className="font-mono text-sm font-medium text-white/90">
              Cola STT · Chirp_2
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

      <LiveProcessingPanel
        refreshKey={refreshKey}
        onStopped={() => void refresh()}
      />

      <div className="max-h-[420px] overflow-y-auto rounded border border-white/8 bg-black/30">
        {assets.length === 0 ? (
          <p className="py-8 text-center font-mono text-[10px] text-white/40">
            Subí audios en la biblioteca para encolar STT.
          </p>
        ) : (
          <ul className="divide-y divide-white/6">
            {assets.map((asset) => {
              const displayStatus = getDisplayStatus(asset);
              const isQueued = displayStatus === "QUEUED";

              return (
                <li
                  key={asset.id}
                  className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[11px] text-white/85">
                      {asset.filename}
                    </p>
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
