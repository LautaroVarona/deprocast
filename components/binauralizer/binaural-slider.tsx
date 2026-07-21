"use client";

import { cn } from "@/lib/utils";

type BinauralSliderProps = {
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

export function BinauralSlider({
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
}: BinauralSliderProps) {
  const displayValue =
    step < 1 ? value.toFixed(1) : String(Math.round(value));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.2em]",
              active ? "text-primary/90" : "text-accent/70",
            )}
          >
            {label}
          </p>
          {sublabel ? (
            <p className="font-mono text-[10px] text-muted-foreground">{sublabel}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "font-mono text-lg tabular-nums transition-colors",
            active ? "text-primary" : "text-accent/90",
          )}
        >
          {displayValue}
          <span className="ml-0.5 text-xs text-muted-foreground">{unit}</span>
        </span>
      </div>

      <div className="flex justify-between px-0.5 font-mono text-[10px] text-muted-foreground">
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
          "binaural-axis-slider h-1.5 w-full cursor-pointer disabled:opacity-40",
          active && "binaural-axis-slider--active",
        )}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
    </div>
  );
}
