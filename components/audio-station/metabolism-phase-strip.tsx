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
    dot: "border-border bg-muted/40",
    text: "text-muted-foreground",
    connector: "bg-muted/40",
  },
  active: {
    dot: "border-primary/50 bg-primary/20",
    text: "text-primary/90",
    connector: "bg-primary/30",
  },
  done: {
    dot: "border-primary/35 bg-primary/15",
    text: "text-primary/75",
    connector: "bg-primary/25",
  },
  attention: {
    dot: "border-accent/40 bg-accent/12",
    text: "text-accent/85",
    connector: "bg-accent/25",
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
                  <Loader2Icon className="size-2.5 animate-spin text-primary" />
                ) : state === "done" ? (
                  <CheckIcon className="size-2.5 text-primary/90" />
                ) : state === "attention" ? (
                  <AlertCircleIcon className="size-2.5 text-accent/90" />
                ) : (
                  <span className="size-1 rounded-full bg-muted/40" />
                )}
              </span>
              {!compact ? (
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-wide",
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
