"use client";

import { MAGO_FILTER_LABELS } from "@/lib/mago/constants";
import type { MagoFilter } from "@/lib/mago/types";
import { cn } from "@/lib/utils";

const FILTERS: MagoFilter[] = ["total", "madre", "doble", "simple"];

type MagoFilterBarProps = {
  value: MagoFilter;
  onChange: (filter: MagoFilter) => void;
};

export function MagoFilterBar({ value, onChange }: MagoFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-white/10 bg-black/30 p-0.5">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={cn(
            "rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
            value === filter
              ? "bg-amber-500/20 text-amber-100"
              : "text-white/40 hover:text-white/70",
          )}
        >
          {MAGO_FILTER_LABELS[filter]}
        </button>
      ))}
    </div>
  );
}
