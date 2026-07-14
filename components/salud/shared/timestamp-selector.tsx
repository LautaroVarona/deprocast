"use client";

import type { TimestampMode } from "@/components/salud/types";
import { cn } from "@/lib/utils";

type TimestampSelectorProps = {
  mode: TimestampMode;
  specificTime: string;
  onModeChange: (mode: TimestampMode) => void;
  onSpecificTimeChange: (time: string) => void;
  className?: string;
};

const OPTIONS: Array<{ value: TimestampMode; label: string }> = [
  { value: "now", label: "Ahora mismo" },
  { value: "30min", label: "Hace 30 minutos" },
  { value: "specific", label: "Hora específica" },
];

export function TimestampSelector({
  mode,
  specificTime,
  onModeChange,
  onSpecificTimeChange,
  className,
}: TimestampSelectorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        ¿Cuándo?
      </p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onModeChange(option.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
              mode === option.value
                ? "border border-zinc-600 bg-zinc-800 text-zinc-100"
                : "border border-dashed border-zinc-700/80 bg-transparent text-zinc-400 hover:border-zinc-600 hover:text-zinc-300",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {mode === "specific" ? (
        <input
          type="time"
          value={specificTime}
          onChange={(event) => onSpecificTimeChange(event.target.value)}
          className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-2 font-mono text-sm text-zinc-200 outline-none focus:border-zinc-600"
        />
      ) : null}
    </div>
  );
}
