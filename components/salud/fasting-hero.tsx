"use client";

import {
  FASTING_GOAL_HOURS,
  formatElapsed,
  formatElapsedCompact,
  getFastingProgress,
  getFastingTone,
} from "@/components/salud/lib/fasting";
import { useLiveFastingMs } from "@/components/salud/hooks/use-live-fasting";
import type { HealthRecordDto } from "@/lib/events/types";
import { cn } from "@/lib/utils";

type FastingHeroProps = {
  records: HealthRecordDto[];
};

export function FastingHero({ records }: FastingHeroProps) {
  const elapsedMs = useLiveFastingMs(records);
  const hasFast = elapsedMs !== null;
  const hours = hasFast ? elapsedMs / (1000 * 60 * 60) : 0;
  const tone = hasFast ? getFastingTone(hours) : "warm";
  const progress = hasFast ? getFastingProgress(elapsedMs) : 0;

  return (
    <div className="relative mx-4 mt-4 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-5 py-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        aria-hidden
      >
        <div
          className={cn(
            "h-full transition-all duration-1000",
            tone === "success"
              ? "bg-gradient-to-r from-emerald-500/30 to-transparent"
              : "bg-gradient-to-r from-orange-500/25 to-transparent",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
          Ayuno activo
        </p>
        <p
          className={cn(
            "mt-2 font-mono text-4xl font-medium tabular-nums tracking-tight sm:text-5xl",
            tone === "success" ? "text-emerald-400" : "text-orange-400",
          )}
        >
          {hasFast ? formatElapsed(elapsedMs) : "00:00:00"}
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          {hasFast
            ? `${formatElapsedCompact(elapsedMs)} · meta ${FASTING_GOAL_HOURS}h`
            : "Sin ingesta previa — el ayuno arranca con tu primera comida"}
        </p>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-zinc-800/80">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              tone === "success" ? "bg-emerald-500/80" : "bg-orange-500/70",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-600">
          <span>0h</span>
          <span>{FASTING_GOAL_HOURS}h</span>
        </div>
      </div>
    </div>
  );
}
