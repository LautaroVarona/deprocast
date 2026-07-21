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
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Por día
        </span>
        <button
          type="button"
          onClick={() => onSelectDay(null)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition",
            !selectedDay
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-border",
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
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : hasActivity
                    ? "border-border bg-muted/40 text-foreground/80 hover:border-border"
                    : "border-border bg-background/40 text-muted-foreground",
              )}
            >
              <span className="font-mono text-[10px] uppercase tracking-wide opacity-70">
                {day.dayLabel.split(" ")[0]?.slice(0, 3)}
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {day.count}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
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
