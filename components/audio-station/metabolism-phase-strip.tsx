"use client";

import type { MetabolismPhase } from "@/lib/audio-station/pipeline-status";
import {
  METABOLISM_PHASES,
  resolvePhaseProgress,
  type AudioPipelineInfo,
} from "@/lib/audio-station/pipeline-status";
import { cn } from "@/lib/utils";
import { AlertCircleIcon, CheckIcon, Loader2Icon } from "lucide-react";

const PHASE_STYLES: Record<
  "pending" | "active" | "done" | "attention",
  { dot: string; text: string; connector: string }
> = {
  pending: {
    dot: "border-white/15 bg-white/5",
    text: "text-white/30",
    connector: "bg-white/10",
  },
  active: {
    dot: "border-sky-400/50 bg-sky-500/20",
    text: "text-sky-200/90",
    connector: "bg-sky-500/30",
  },
  done: {
    dot: "border-emerald-500/35 bg-emerald-500/15",
    text: "text-emerald-200/75",
    connector: "bg-emerald-500/25",
  },
  attention: {
    dot: "border-amber-500/40 bg-amber-500/12",
    text: "text-amber-200/85",
    connector: "bg-amber-500/25",
  },
};

type MetabolismPhaseStripProps = {
  pipeline: AudioPipelineInfo;
  compact?: boolean;
};

export function MetabolismPhaseStrip({
  pipeline,
  compact = false,
}: MetabolismPhaseStripProps) {
  const progress = resolvePhaseProgress(pipeline);

  return (
    <div
      className={cn(
        "flex items-center",
        compact ? "gap-1" : "gap-2",
      )}
      aria-label="Fases de metabolización"
    >
      {METABOLISM_PHASES.map((phase, index) => {
        const state = progress[phase.id as MetabolismPhase];
        const styles = PHASE_STYLES[state];
        const isLast = index === METABOLISM_PHASES.length - 1;

        return (
          <div key={phase.id} className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full border",
                  styles.dot,
                )}
              >
                {state === "active" ? (
                  <Loader2Icon className="size-2.5 animate-spin text-sky-300" />
                ) : state === "done" ? (
                  <CheckIcon className="size-2.5 text-emerald-300/90" />
                ) : state === "attention" ? (
                  <AlertCircleIcon className="size-2.5 text-amber-300/90" />
                ) : (
                  <span className="size-1 rounded-full bg-white/20" />
                )}
              </span>
              {!compact ? (
                <span
                  className={cn(
                    "font-mono text-[9px] uppercase tracking-wide",
                    styles.text,
                  )}
                >
                  {phase.label}
                </span>
              ) : null}
            </div>
            {!isLast ? (
              <span
                className={cn(
                  "h-px w-4 sm:w-6",
                  styles.connector,
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
