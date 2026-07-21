"use client";

import { cn } from "@/lib/utils";

type VolumeDbSliderProps = {
  label: string;
  valueDb: number;
  minDb: number;
  maxDb: number;
  step?: number;
  onChange: (db: number) => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
};

export function VolumeDbSlider({
  label,
  valueDb,
  minDb,
  maxDb,
  step = 1,
  onChange,
  disabled = false,
  active = false,
  className,
}: VolumeDbSliderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p
          className={cn(
            "font-mono text-[10px] font-semibold uppercase tracking-[0.2em]",
            active ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "font-mono text-lg font-semibold tabular-nums",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {valueDb > minDb ? valueDb.toFixed(0) : "−∞"}
          <span className="ml-0.5 text-xs text-muted-foreground">dB</span>
        </span>
      </div>

      <div className="flex justify-between px-0.5 font-mono text-[10px] text-muted-foreground">
        <span>{minDb} dB</span>
        <span>{maxDb} dB</span>
      </div>

      <input
        type="range"
        min={minDb}
        max={maxDb}
        step={step}
        value={valueDb}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "isochronic-axis-slider h-2 w-full cursor-pointer disabled:opacity-40",
          active && "isochronic-axis-slider--active",
        )}
        aria-label={label}
        aria-valuemin={minDb}
        aria-valuemax={maxDb}
        aria-valuenow={valueDb}
      />
    </div>
  );
}
