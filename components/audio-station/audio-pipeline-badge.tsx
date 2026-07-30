"use client";

import type { AudioPipelineInfo } from "@/lib/audio-station/pipeline-status";
import { buildValidarAduanaHref } from "@/lib/navigation/resolve-href";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PurifyAudioButton } from "@/components/audio-station/purify-audio-button";

const STAGE_STYLES: Record<AudioPipelineInfo["stage"], string> = {
  pending_stt: "border-zinc-700 bg-zinc-950 text-zinc-500",
  stt_queued: "border-amber-500/25 bg-zinc-950 text-amber-500/80",
  stt_processing: "border-amber-500/40 bg-zinc-950 text-amber-500",
  stt_error: "border-red-900 bg-zinc-950 text-red-500",
  lineage: "border-amber-500/30 bg-zinc-950 text-amber-500",
  quant: "border-amber-500/30 bg-zinc-950 text-amber-500",
  vectors: "border-amber-500/30 bg-zinc-950 text-amber-500",
  purifying: "border-amber-500/30 bg-zinc-950 text-amber-500",
  pending_purify: "border-amber-500/25 bg-zinc-950 text-amber-500/80",
  in_validation: "border-amber-500/40 bg-zinc-950 text-amber-500",
  validated: "border-emerald-500/30 bg-zinc-950 text-emerald-500",
  coagulated: "border-emerald-500/40 bg-zinc-950 text-emerald-500",
};

type AudioPipelineBadgeProps = {
  pipeline: AudioPipelineInfo;
  className?: string;
};

export function AudioPipelineBadge({ pipeline, className }: AudioPipelineBadgeProps) {
  return (
    <span
      title={pipeline.hint}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        STAGE_STYLES[pipeline.stage],
        className,
      )}
    >
      {pipeline.label}
    </span>
  );
}

export function AudioPipelineNextAction({
  pipeline,
  assetId,
  filename,
  onPurified,
}: {
  pipeline: AudioPipelineInfo;
  assetId: string;
  filename: string;
  onPurified?: (reviewId: string) => void;
}) {
  if (pipeline.stage === "in_validation" && pipeline.reviewId) {
    return (
      <Link
        href={buildValidarAduanaHref(pipeline.reviewId)}
        className="font-mono text-[10px] text-primary/90 underline-offset-2 hover:underline"
      >
        Validar →
      </Link>
    );
  }

  if (pipeline.stage === "pending_purify") {
    return (
      <PurifyAudioButton
        assetId={assetId}
        filename={filename}
        onPurified={onPurified}
      />
    );
  }

  return null;
}
