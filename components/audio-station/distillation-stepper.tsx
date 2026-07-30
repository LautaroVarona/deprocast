"use client";

import {
  DISTILL_GLYPHS,
  DISTILL_STATIONS,
  type DistillStation,
} from "@/lib/audio-upload/constants";
import type { DistillStepperState } from "@/lib/audio-station/pipeline-status";
import { cn } from "@/lib/utils";

const STATE_CLASS: Record<string, string> = {
  idle: "text-zinc-600",
  active: "text-amber-500 animate-pulse",
  done: "text-emerald-500",
  error: "text-red-500",
};

type DistillationStepperProps = {
  distill: DistillStepperState;
  className?: string;
  compact?: boolean;
};

export function DistillationStepper({
  distill,
  className,
  compact = true,
}: DistillationStepperProps) {
  if (distill.station === "ERROR" && distill.errorLabel) {
    return (
      <span
        className={cn(
          "font-mono text-[10px] tracking-tight text-red-500",
          className,
        )}
      >
        {distill.errorLabel}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-1 gap-y-0.5 font-mono text-[10px] tracking-tight",
        compact && "max-w-full",
        className,
      )}
      aria-label={`Estación ${distill.station}`}
    >
      {DISTILL_STATIONS.map((station: DistillStation) => {
        const state = distill.steps[station];
        return (
          <span
            key={station}
            className={cn(STATE_CLASS[state] ?? STATE_CLASS.idle)}
            title={`${station}: ${state}`}
          >
            {DISTILL_GLYPHS[station]}
          </span>
        );
      })}
    </div>
  );
}
