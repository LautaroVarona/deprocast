"use client";

import { ACTIVITY_METRIC_OPTIONS } from "@/components/salud/constants";
import type { ActivityMetricType } from "@/components/salud/types";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MetricTypeSelectProps = {
  value: ActivityMetricType;
  onChange: (value: ActivityMetricType) => void;
};

export function MetricTypeSelect({ value, onChange }: MetricTypeSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected =
    ACTIVITY_METRIC_OPTIONS.find((option) => option.value === value) ??
    ACTIVITY_METRIC_OPTIONS[0];

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-800/80",
          "bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-200 transition-colors",
          "hover:border-zinc-700/80 focus:border-zinc-600 focus:outline-none",
          open && "border-zinc-600",
        )}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-zinc-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul
          className={cn(
            "absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-zinc-800/80",
            "bg-zinc-950 shadow-xl shadow-black/40",
          )}
        >
          {ACTIVITY_METRIC_OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors",
                  value === option.value
                    ? "bg-zinc-800/80 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200",
                )}
              >
                {option.label}
                {value === option.value ? (
                  <CheckIcon className="size-4 text-amber-500/80" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
