"use client";

import { DistillationStepper } from "@/components/audio-station/distillation-stepper";
import { MicroStationRow } from "@/components/audio-station/micro-station-row";
import { DeleteAssetButton } from "@/components/delete-asset-button";
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
import { useMemo } from "react";

const TONE_BORDER: Record<MetabolismCardTone, string> = {
  processing: "border-amber-700/50",
  hitl: "border-amber-600/60",
  alma: "border-legion-marble/50",
  attention: "border-rose-800",
  idle: "border-stone-700",
};

type AudioMetabolismCardProps = {
  asset: AudioAssetSummary;
  queuedIds: Set<string>;
  purifyingIds?: Set<string>;
  activeId: string | null;
  reviewByAssetId: Map<string, string>;
  metabolism?: AssetMetabolismSummary;
  onRefresh: () => void;
  tactical?: boolean;
};

export function AudioMetabolismCard({
  asset,
  queuedIds,
  purifyingIds = new Set(),
  activeId,
  reviewByAssetId,
  onRefresh,
}: AudioMetabolismCardProps) {
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
  const isErr =
    pipeline.stage === "stt_error" || pipeline.distill.station === "ERROR";

  const footer = isErr
    ? pipeline.distill.errorLabel ?? "[ERR]"
    : pipeline.stage === "coagulated" || pipeline.stage === "validated"
      ? "[COAGVLADO]"
      : pipeline.stage === "in_validation"
        ? "[SENADO · VALIDAR]"
        : `[${pipeline.pipelineStation ?? "DESTILANDO"}]`;

  const lineage = asset.lineage;

  return (
    <article
      className={cn(
        "flex h-32 flex-col justify-between border border-b-4 border-b-stone-950 bg-stone-800 p-3 font-mono rounded-none transition-colors hover:border-amber-700/40",
        TONE_BORDER[tone],
        isErr && "border-rose-800",
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="space-y-0.5">
        <p className="truncate font-serif text-xs tracking-tight text-legion-bone">
          {asset.filename}
        </p>
        <div className="flex flex-wrap gap-x-2 text-[9px] text-legion-patina">
          {lineage ? (
            <>
              <span>{lineage.fecha}</span>
              <span className="text-amber-500/80">{lineage.hora}</span>
              {lineage.lugar ? (
                <span className="truncate max-w-[100px]">{lineage.lugar}</span>
              ) : null}
              {lineage.indefinido ? <span>[¿?]</span> : null}
            </>
          ) : (
            <span>linaje…</span>
          )}
        </div>
      </header>

      <MicroStationRow distill={pipeline.distill} />

      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "truncate text-[10px] uppercase",
            isErr
              ? "text-rose-800"
              : pipeline.stage === "coagulated"
                ? "text-legion-marble"
                : "text-legion-patina",
            isProcessing && "animate-pulse text-amber-500/90",
          )}
        >
          {footer}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {pipeline.stage === "stt_error" ? (
            <ProcessButton assetId={asset.id} onProcessed={onRefresh} />
          ) : null}
          {isProcessing ? (
            <StopProcessButton assetId={asset.id} onStopped={onRefresh} />
          ) : null}
          {pipeline.stage === "in_validation" && pipeline.reviewId ? (
            <Link
              href={`/validar?id=${pipeline.reviewId}`}
              className="text-[9px] text-amber-500 hover:underline"
            >
              Senado
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

/** @deprecated alias */
export function AudioMetabolismLegacyStepper({
  distill,
}: {
  distill: ReturnType<typeof resolveAudioPipelineStage>["distill"];
}) {
  return <DistillationStepper distill={distill} />;
}
