"use client";

import type { AudioPipelineInfo } from "@/lib/audio-station/pipeline-status";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PurifyAudioButton } from "@/components/audio-station/purify-audio-button";

const STAGE_STYLES: Record<AudioPipelineInfo["stage"], string> = {
  pending_stt: "border-primary/20 bg-primary/8 text-primary/70",
  stt_queued: "border-primary/25 bg-primary/10 text-primary/80",
  stt_processing: "border-primary/35 bg-primary/12 text-primary/90",
  stt_error: "border-accent/30 bg-accent/10 text-accent/85",
  purifying: "border-primary/35 bg-primary/12 text-foreground/90",
  pending_purify: "border-accent/30 bg-accent/10 text-accent/85",
  in_validation: "border-primary/30 bg-primary/10 text-primary/90",
  validated: "border-border bg-muted/40 text-muted-foreground",
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
        href={`/validar?id=${pipeline.reviewId}`}
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
