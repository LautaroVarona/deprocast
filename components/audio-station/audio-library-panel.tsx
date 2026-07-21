"use client";

import { useAudioStation } from "@/components/audio-station/audio-station-context";
import { AudioPipelineBadge } from "@/components/audio-station/audio-pipeline-badge";
import { UploadDropzone } from "@/components/upload-dropzone";
import { StatusBadge } from "@/components/status-badge";
import { ViewDetailsLink } from "@/components/view-details-link";
import { DeleteAssetButton } from "@/components/delete-asset-button";
import { resolveAudioPipelineStage } from "@/lib/audio-station/pipeline-status";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AudioLinesIcon, RefreshCwIcon } from "lucide-react";

export function AudioLibraryPanel() {
  const { assets, isLoading, refresh, refreshKey, queueStatus, reviewByAssetId } =
    useAudioStation();

  const queuedIds = new Set(queueStatus?.queuedIds ?? []);
  const activeId = queueStatus?.active?.id ?? null;

  const pendingCount = assets.filter(
    (asset) => asset.status === "PENDING" || asset.status === "ERROR",
  ).length;
  const completedCount = assets.filter((asset) => asset.transcript).length;

  return (
    <section className="audio-noir-panel space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AudioLinesIcon className="size-4 text-primary/80" />
            <h2 className="font-mono text-sm font-medium text-muted-foreground">
              Biblioteca de audios
            </h2>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">
            {assets.length} archivo{assets.length === 1 ? "" : "s"} ·{" "}
            {completedCount} transcrito{completedCount === 1 ? "" : "s"} ·{" "}
            {pendingCount} pendiente{pendingCount === 1 ? "" : "s"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          <RefreshCwIcon className={cn("size-3", isLoading && "animate-spin")} />
          Actualizar
        </button>
      </div>

      <UploadDropzone
        variant="embedded"
        onUploaded={() => void refresh()}
      />

      <div className="max-h-[420px] overflow-y-auto rounded border border-border bg-muted/40">
        {isLoading ? (
          <p className="py-8 text-center font-mono text-[10px] text-muted-foreground">
            Cargando biblioteca…
          </p>
        ) : assets.length === 0 ? (
          <p className="py-8 text-center font-mono text-[10px] text-muted-foreground">
            Todavía no hay audios. Arrastrá archivos arriba para empezar.
          </p>
        ) : (
          <ul className="divide-y divide-white/6">
            {assets.map((asset) => {
              const pipeline = resolveAudioPipelineStage(asset, {
                queuedIds,
                activeId,
                reviewByAssetId,
              });

              return (
              <li
                key={asset.id}
                className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {asset.filename}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {formatDate(asset.originalCreatedAt)}
                    {asset.transcript?.preview ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {asset.transcript.preview}
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <AudioPipelineBadge pipeline={pipeline} />
                  <StatusBadge status={asset.status} />
                  {(asset.transcript || asset.status === "COMPLETED") && (
                    <ViewDetailsLink assetId={asset.id} label="Detalle" />
                  )}
                  <DeleteAssetButton
                    assetId={asset.id}
                    filename={asset.filename}
                    onDeleted={() => void refresh()}
                    key={`${asset.id}-${refreshKey}`}
                  />
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
