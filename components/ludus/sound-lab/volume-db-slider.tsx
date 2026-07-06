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
            active ? "text-rose-200" : "text-white/75",
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "font-mono text-lg font-semibold tabular-nums",
            active ? "text-white" : "text-white/85",
          )}
        >
          {valueDb > minDb ? valueDb.toFixed(0) : "−∞"}
          <span className="ml-0.5 text-xs text-white/35">dB</span>
        </span>
      </div>

      <div className="flex justify-between px-0.5 font-mono text-[9px] text-white/50">
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
