"use client";

import { toDayKey } from "@/components/historial/historial-utils";
import { cn } from "@/lib/utils";

export type DayCount = {
  dayKey: string;
  dayLabel: string;
  count: number;
};

type HistorialDayStripProps = {
  dayCounts: DayCount[];
  selectedDay: string | null;
  onSelectDay: (dayKey: string | null) => void;
};

export function HistorialDayStrip({
  dayCounts,
  selectedDay,
  onSelectDay,
}: HistorialDayStripProps) {
  const todayKey = toDayKey(new Date());

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
          Por día
        </span>
        <button
          type="button"
          onClick={() => onSelectDay(null)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition",
            !selectedDay
              ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
              : "border-zinc-700 text-zinc-500 hover:border-zinc-600",
          )}
        >
          Todos
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {dayCounts.map((day) => {
          const isSelected = selectedDay === day.dayKey;
          const isToday = day.dayKey === todayKey;
          const hasActivity = day.count > 0;

          return (
            <button
              key={day.dayKey}
              type="button"
              onClick={() => onSelectDay(isSelected ? null : day.dayKey)}
              className={cn(
                "flex min-w-[4.5rem] shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2 py-2 transition",
                isSelected
                  ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-100"
                  : hasActivity
                    ? "border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600"
                    : "border-zinc-800/60 bg-zinc-950/40 text-zinc-600",
              )}
            >
              <span className="font-mono text-[9px] uppercase tracking-wide opacity-70">
                {day.dayLabel.split(" ")[0]?.slice(0, 3)}
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {day.count}
              </span>
              <span className="font-mono text-[9px] text-zinc-500">
                {day.dayKey.slice(8)}
                {isToday ? " · hoy" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
