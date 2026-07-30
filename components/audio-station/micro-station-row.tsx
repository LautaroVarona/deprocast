"use client";

import {
  DISTILL_STATIONS,
  type DistillStation,
} from "@/lib/audio-upload/constants";
import type { DistillStepperState } from "@/lib/audio-station/pipeline-status";
import { cn } from "@/lib/utils";

/** Glifos Legio Victrix (estaciones moleculares). */
export const LEGIO_GLYPHS: Record<DistillStation, string> = {
  STT: "ORACVLO",
  LINEAGE: "LINAJE",
  QUANT: "QVANTA",
  VECTORS: "VECTORES",
  HITL: "SENADO",
  COAG: "COAGVLO",
};

export function MicroStationRow({
  distill,
  compact = true,
}: {
  distill: DistillStepperState;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-1 font-mono tracking-tight",
        compact ? "text-[8px]" : "text-[9px]",
      )}
    >
      {DISTILL_STATIONS.map((station, index) => {
        const state = distill.steps[station];
        return (
          <span key={station} className="inline-flex items-center gap-0.5">
            <span
              className={cn(
                state === "done" && "text-legion-marble",
                state === "active" && "animate-pulse text-legion-gold",
                state === "error" && "text-rose-800",
                state === "idle" && "text-legion-patina",
              )}
              title={station}
            >
              {LEGIO_GLYPHS[station]}
            </span>
            {index < DISTILL_STATIONS.length - 1 ? (
              <span className="text-legion-patina/50">|</span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
