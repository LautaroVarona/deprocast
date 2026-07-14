"use client";

import {
  FASTING_GOAL_HOURS,
  formatElapsedCompact,
  getFastingProgress,
  getFastingTone,
} from "@/components/salud/lib/fasting";
import { useLiveFastingMs } from "@/components/salud/hooks/use-live-fasting";
import type { HealthRecordDto } from "@/lib/events/types";
import { cn } from "@/lib/utils";

type FastingStripProps = {
  records: HealthRecordDto[];
  className?: string;
};

export function FastingStrip({ records, className }: FastingStripProps) {
  const elapsedMs = useLiveFastingMs(records);
  const hasFast = elapsedMs !== null;
  const hours = hasFast ? elapsedMs / (1000 * 60 * 60) : 0;
  const tone = hasFast ? getFastingTone(hours) : "warm";
  const progress = hasFast ? getFastingProgress(elapsedMs) : 0;

  return (
    <div
      className={cn(
        "border-b border-zinc-800/80 bg-zinc-900/40 px-4 py-2.5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-mono text-lg font-medium tabular-nums",
                tone === "success" ? "text-emerald-400" : "text-orange-400",
              )}
            >
              {hasFast ? formatElapsedCompact(elapsedMs) : "0m"}
            </span>
            <span className="truncate text-xs text-zinc-500">
              {hasFast ? "de ayuno" : "Sin ayuno activo"}
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-800/80">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                tone === "success" ? "bg-emerald-500/80" : "bg-orange-500/70",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-zinc-600">
          {FASTING_GOAL_HOURS}h
        </span>
      </div>
    </div>
  );
}
