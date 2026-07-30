"use client";

import { DistillationStepper } from "@/components/audio-station/distillation-stepper";
import { MicroStationRow } from "@/components/upload-dropzone";
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
      ? "[COAGULADO]"
      : pipeline.stage === "in_validation"
        ? "[HITL · VALIDAR]"
        : `[${pipeline.pipelineStation ?? "DESTILANDO"}]`;

  const lineage = asset.lineage;

  return (
    <article
      className={cn(
        "flex h-32 flex-col justify-between border bg-zinc-950 p-3 font-mono rounded-none transition-colors hover:border-[#FFB000]/30",
        TONE_BORDER[tone],
        isErr && "border-red-900",
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="space-y-0.5">
        <p className="truncate text-xs text-zinc-400">{asset.filename}</p>
        <div className="flex flex-wrap gap-x-2 text-[9px] text-zinc-600">
          {lineage ? (
            <>
              <span>{lineage.fecha}</span>
              <span className="text-[#FFB000]/70">{lineage.hora}</span>
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
              ? "text-red-500"
              : pipeline.stage === "coagulated"
                ? "text-emerald-500"
                : "text-zinc-600",
            isProcessing && "animate-pulse text-[#FFB000]/80",
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
              className="text-[9px] text-[#FFB000] hover:underline"
            >
              HITL
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

/** @deprecated alias — MicroStationRow vive en upload-dropzone */
export function AudioMetabolismLegacyStepper({
  distill,
}: {
  distill: ReturnType<typeof resolveAudioPipelineStage>["distill"];
}) {
  return <DistillationStepper distill={distill} />;
}
