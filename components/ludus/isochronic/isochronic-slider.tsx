"use client";

import { cn } from "@/lib/utils";

type IsochronicSliderProps = {
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
};

export function IsochronicSlider({
  label,
  sublabel,
  value,
  min,
  max,
  step = 1,
  unit = "Hz",
  onChange,
  disabled = false,
  active = false,
  className,
}: IsochronicSliderProps) {
  const displayValue =
    step < 1 ? value.toFixed(1) : String(Math.round(value));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p
            className={cn(
              "font-mono text-[10px] font-semibold uppercase tracking-[0.2em]",
              active ? "text-rose-200" : "text-white/75",
            )}
          >
            {label}
          </p>
          {sublabel ? (
            <p className="font-mono text-[9px] text-white/45">{sublabel}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "font-mono text-lg font-semibold tabular-nums",
            active ? "text-white" : "text-white/85",
          )}
        >
          {displayValue}
          <span className="ml-0.5 text-xs text-white/35">{unit}</span>
        </span>
      </div>

      <div className="flex justify-between px-0.5 font-mono text-[9px] text-white/50">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          "isochronic-axis-slider h-2 w-full cursor-pointer disabled:opacity-40",
          active && "isochronic-axis-slider--active",
        )}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
    </div>
  );
}
