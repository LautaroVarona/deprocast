"use client";

import { cn } from "@/lib/utils";
import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";

type AxisSliderProps = {
  label: string;
  sublabel?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  active?: boolean;
  tickLabels?: string[];
  className?: string;
};

export function AxisSlider({
  label,
  sublabel,
  value,
  min = MIN_BASE_WEIGHT,
  max = MAX_BASE_WEIGHT,
  onChange,
  disabled = false,
  active = false,
  tickLabels,
  className,
}: AxisSliderProps) {
  const span = max - min + 1;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.2em]",
              active ? "text-emerald-400/90" : "text-white/40",
            )}
          >
            {label}
          </p>
          {sublabel ? (
            <p className="font-mono text-[9px] text-white/25">{sublabel}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "font-mono text-lg tabular-nums transition-colors",
            active ? "text-emerald-300" : "text-white/70",
          )}
        >
          {value}
        </span>
      </div>

      {tickLabels && tickLabels.length === span ? (
        <div className="flex justify-between px-0.5 font-mono text-[8px] text-white/30">
          {tickLabels.map((tick) => (
            <span key={tick} className="w-4 truncate text-center">
              {tick.slice(0, 4)}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex justify-between px-0.5 font-mono text-[9px] text-white/30">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}

      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          "molecular-axis-slider h-1.5 w-full cursor-pointer disabled:opacity-40",
          active && "molecular-axis-slider--active",
        )}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
    </div>
  );
}
