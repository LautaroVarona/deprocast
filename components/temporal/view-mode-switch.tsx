"use client";

import { cn } from "@/lib/utils";

export type CalendarViewMode = "month" | "week" | "day";

type ViewModeSwitchProps = {
  mode: CalendarViewMode;
  onChange: (mode: CalendarViewMode) => void;
  skin?: "noir" | "ludus";
};

const MODES: { id: CalendarViewMode; label: string; hint: string }[] = [
  { id: "month", label: "Castillo", hint: "1" },
  { id: "week", label: "Campaña", hint: "2" },
  { id: "day", label: "Trinchera", hint: "3" },
];

export function ViewModeSwitch({
  mode,
  onChange,
  skin = "noir",
}: ViewModeSwitchProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border p-0.5",
        skin === "noir" ? "border-white/10 bg-black/40" : "border-white/10 bg-black/25",
      )}
      role="tablist"
    >
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={mode === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
            mode === item.id
              ? "bg-cyan-500/20 text-cyan-100"
              : "text-zinc-500 hover:text-zinc-300",
          )}
        >
          {item.label}
          <span className="ml-1 opacity-40">{item.hint}</span>
        </button>
      ))}
    </div>
  );
}
