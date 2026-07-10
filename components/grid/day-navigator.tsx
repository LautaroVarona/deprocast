"use client";

import type { DayOffset } from "@/lib/pendientes/types";
import { cn } from "@/lib/utils";

const DAY_LABELS: Record<DayOffset, string> = {
  yesterday: "Ayer",
  today: "Hoy",
  tomorrow: "Mañana",
};

type DayNavigatorProps = {
  selectedDay: DayOffset;
  onDayChange: (day: DayOffset) => void;
};

export function DayNavigator({ selectedDay, onDayChange }: DayNavigatorProps) {
  const days: DayOffset[] = ["yesterday", "today", "tomorrow"];

  return (
    <nav
      className="flex shrink-0 items-center justify-center gap-1 border-b border-border px-3 py-2"
      aria-label="Navegación temporal"
    >
      {days.map((day) => (
        <button
          key={day}
          type="button"
          onClick={() => onDayChange(day)}
          className={cn(
            "rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-[0.18em] transition-colors",
            selectedDay === day
              ? "bg-primary/15 text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {DAY_LABELS[day]}
        </button>
      ))}
    </nav>
  );
}
