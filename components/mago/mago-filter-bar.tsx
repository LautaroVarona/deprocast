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
    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={cn(
            "rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
            value === filter
              ? "bg-accent/20 text-accent"
              : "text-muted-foreground hover:text-muted-foreground",
          )}
        >
          {MAGO_FILTER_LABELS[filter]}
        </button>
      ))}
    </div>
  );
}
