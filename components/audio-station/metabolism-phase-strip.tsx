"use client";

import { DistillationStepper } from "@/components/audio-station/distillation-stepper";
import type { AudioPipelineInfo } from "@/lib/audio-station/pipeline-status";

type MetabolismPhaseStripProps = {
  pipeline: AudioPipelineInfo;
  compact?: boolean;
};

/** Alias noir: el strip de fases es el micro-stepper de 6 estaciones. */
export function MetabolismPhaseStrip({
  pipeline,
}: MetabolismPhaseStripProps) {
  return <DistillationStepper distill={pipeline.distill} />;
}
