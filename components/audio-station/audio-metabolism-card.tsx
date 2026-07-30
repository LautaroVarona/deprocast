"use client";

import {
  AudioPipelineBadge,
  AudioPipelineNextAction,
} from "@/components/audio-station/audio-pipeline-badge";
import { DistillationStepper } from "@/components/audio-station/distillation-stepper";
import { DeleteAssetButton } from "@/components/delete-asset-button";
import { DownloadTranscriptButton } from "@/components/download-transcript-button";
import { ProcessButton } from "@/components/process-button";
import { StopProcessButton } from "@/components/stop-process-button";
import { ViewDetailsLink } from "@/components/view-details-link";
import type { AssetMetabolismSummary } from "@/lib/audio-station/metabolism";
import {
  resolveMetabolismCardTone,
  type MetabolismCardTone,
} from "@/lib/audio-station/asset-display";
import type { AudioAssetSummary } from "@/lib/audio-station/types";
import { resolveAudioPipelineStage } from "@/lib/audio-station/pipeline-status";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo, useState } from "react";

const TONE_BORDER: Record<MetabolismCardTone, string> = {
  processing: "border-[#FFB000]/35",
  hitl: "border-[#FFB000]/50",
  alma: "border-emerald-500/40",
  attention: "border-red-900",
  idle: "border-zinc-800",
};

type AudioMetabolismCardProps = {
  asset: AudioAssetSummary;
  queuedIds: Set<string>;
  purifyingIds?: Set<string>;
  activeId: string | null;
  reviewByAssetId: Map<string, string>;
  metabolism?: AssetMetabolismSummary;
  onRefresh: () => void;
  /** Tarjeta táctica fija para HUD horizontal */
  tactical?: boolean;
};

export function AudioMetabolismCard({
  asset,
  queuedIds,
  purifyingIds = new Set(),
  activeId,
  reviewByAssetId,
  onRefresh,
  tactical = true,
}: AudioMetabolismCardProps) {
  const [expanded, setExpanded] = useState(false);

  const pipeline = useMemo(
    () =>
      resolveAudioPipelineStage(asset, {
        queuedIds,
        activeId,
        purifyingIds,
        reviewByAssetId,
      }),
    [asset, queuedIds, activeId, purifyingIds, reviewByAssetId],
  );

  const tone = resolveMetabolismCardTone(pipeline);
  const isProcessing =
    pipeline.stage === "stt_processing" ||
    pipeline.stage === "stt_queued" ||
    pipeline.stage === "purifying" ||
    pipeline.stage === "lineage" ||
    pipeline.stage === "quant" ||
    pipeline.stage === "vectors";
  const isErr = pipeline.stage === "stt_error" || pipeline.distill.station === "ERROR";

  const footer = isErr
    ? pipeline.distill.errorLabel ?? "[ERR]"
    : pipeline.stage === "coagulated" || pipeline.stage === "validated"
      ? "[COAGULADO]"
      : pipeline.stage === "in_validation"
        ? "[HITL · VALIDAR]"
        : "[DESTILANDO MOLÉCULAS]";

  const lineage = asset.lineage;

  if (tactical) {
    return (
      <article
        className={cn(
          "flex h-[280px] w-80 min-w-[320px] shrink-0 flex-col justify-between border bg-zinc-950 p-4 font-mono rounded-none",
          TONE_BORDER[tone],
          isErr && "border-red-900",
        )}
      >
        <header className="space-y-1">
          <p className="truncate max-w-[280px] text-xs text-zinc-300">
            {asset.filename}
          </p>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-zinc-500">
            {lineage ? (
              <>
                <span className={lineage.indefinido ? "text-zinc-600" : "text-zinc-400"}>
                  {lineage.fecha}
                </span>
                <span className="text-[#FFB000]/70">{lineage.hora}</span>
                {lineage.lugar ? (
                  <span className="truncate max-w-[120px] text-zinc-400">
                    {lineage.lugar}
                  </span>
                ) : null}
                {lineage.indefinido ? (
                  <span className="text-zinc-600">[indefinido]</span>
                ) : null}
              </>
            ) : (
              <span className="text-zinc-600">linaje pendiente</span>
            )}
          </div>
        </header>

        <div className="py-2">
          <DistillationStepper distill={pipeline.distill} />
        </div>

        <div className="space-y-2">
          <p
            className={cn(
              "text-[10px]",
              isErr
                ? "text-red-500"
                : pipeline.stage === "coagulated"
                  ? "text-emerald-500"
                  : "animate-pulse text-[#FFB000]",
            )}
          >
            {footer}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {pipeline.stage === "stt_error" ? (
              <ProcessButton assetId={asset.id} onProcessed={onRefresh} />
            ) : null}
            {isProcessing ? (
              <StopProcessButton assetId={asset.id} onStopped={onRefresh} />
            ) : null}
            {pipeline.stage === "in_validation" && pipeline.reviewId ? (
              <Link
                href={`/validar?id=${pipeline.reviewId}`}
                className="text-[10px] text-[#FFB000] underline-offset-2 hover:underline"
              >
                HITL →
              </Link>
            ) : null}
            <ViewDetailsLink assetId={asset.id} />
            <DeleteAssetButton
              assetId={asset.id}
              filename={asset.filename}
              onDeleted={onRefresh}
            />
          </div>
        </div>
      </article>
    );
  }

  // Fallback no-táctico (legacy expandible)
  return (
    <article
      className={cn(
        "border bg-zinc-950 rounded-none",
        TONE_BORDER[tone],
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-1.5 text-left"
      >
        <span className="truncate max-w-[180px] text-xs font-mono text-zinc-400">
          {asset.filename}
        </span>
        <DistillationStepper distill={pipeline.distill} className="flex-1" />
      </button>
      {expanded ? (
        <div className="space-y-2 border-t border-zinc-800 px-3 py-2">
          <AudioPipelineBadge pipeline={pipeline} />
          <AudioPipelineNextAction
            pipeline={pipeline}
            assetId={asset.id}
            filename={asset.filename}
            onPurified={onRefresh}
          />
          {asset.transcript ? (
            <DownloadTranscriptButton assetId={asset.id} size="sm" />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
