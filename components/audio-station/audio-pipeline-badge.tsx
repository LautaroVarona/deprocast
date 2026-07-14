"use client";

import type { AudioPipelineInfo } from "@/lib/audio-station/pipeline-status";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PurifyAudioButton } from "@/components/audio-station/purify-audio-button";

const STAGE_STYLES: Record<AudioPipelineInfo["stage"], string> = {
  pending_stt: "border-sky-500/20 bg-sky-500/8 text-sky-200/70",
  stt_queued: "border-sky-500/25 bg-sky-500/10 text-sky-200/80",
  stt_processing: "border-sky-500/35 bg-sky-500/12 text-sky-100/90",
  stt_error: "border-amber-500/30 bg-amber-500/10 text-amber-200/85",
  purifying: "border-violet-500/35 bg-violet-500/12 text-violet-100/90",
  pending_purify: "border-amber-500/30 bg-amber-500/10 text-amber-200/85",
  in_validation: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200/90",
  validated: "border-white/10 bg-white/5 text-white/40",
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
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide",
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
        href={`/validar?id=${pipeline.reviewId}`}
        className="font-mono text-[9px] text-emerald-300/90 underline-offset-2 hover:underline"
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
