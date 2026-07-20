"use client";

import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";
import { cn } from "@/lib/utils";

type HermeticScaleProps = {
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  disabled?: boolean;
  className?: string;
  /** Compact mode for cards */
  size?: "sm" | "md";
};

const BLOCKS = Array.from(
  { length: MAX_BASE_WEIGHT - MIN_BASE_WEIGHT + 1 },
  (_, i) => i + MIN_BASE_WEIGHT,
);

function intensityClass(level: number, active: boolean): string {
  if (!active) {
    return "border-white/10 bg-white/[0.03]";
  }
  if (level >= 10) {
    return "border-amber-300/70 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.55)]";
  }
  if (level >= 7) {
    return "border-amber-400/60 bg-amber-500/90 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
  }
  if (level >= 4) {
    return "border-amber-500/50 bg-amber-600/80";
  }
  return "border-amber-700/40 bg-amber-800/70";
}

export function HermeticScale({
  value,
  onChange,
  onCommit,
  disabled = false,
  className,
  size = "md",
}: HermeticScaleProps) {
  const clamped = Math.min(
    MAX_BASE_WEIGHT,
    Math.max(MIN_BASE_WEIGHT, value),
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] tracking-[0.2em] text-amber-500/70 uppercase">
          Escala hermética
        </span>
        <span
          className={cn(
            "font-mono tabular-nums text-amber-300",
            size === "sm" ? "text-sm" : "text-lg",
          )}
        >
          {clamped}
          <span className="text-muted-foreground">/{MAX_BASE_WEIGHT}</span>
        </span>
      </div>

      <div
        role="slider"
        aria-label="Peso de calibración"
        aria-valuemin={MIN_BASE_WEIGHT}
        aria-valuemax={MAX_BASE_WEIGHT}
        aria-valuenow={clamped}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={cn(
          "flex gap-1 outline-none focus-visible:ring-1 focus-visible:ring-amber-500/50",
          disabled && "pointer-events-none opacity-50",
        )}
        onKeyDown={(event) => {
          if (disabled) return;
          let next = clamped;
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            next = Math.min(MAX_BASE_WEIGHT, clamped + 1);
          } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            next = Math.max(MIN_BASE_WEIGHT, clamped - 1);
          } else if (event.key === "Home") {
            next = MIN_BASE_WEIGHT;
          } else if (event.key === "End") {
            next = MAX_BASE_WEIGHT;
          } else if (event.key === "Enter" || event.key === " ") {
            onCommit?.(clamped);
            return;
          } else {
            return;
          }
          event.preventDefault();
          onChange(next);
        }}
      >
        {BLOCKS.map((level) => {
          const active = level <= clamped;
          return (
            <button
              key={level}
              type="button"
              disabled={disabled}
              aria-label={`Peso ${level}`}
              title={`${level}`}
              onClick={() => {
                onChange(level);
                onCommit?.(level);
              }}
              className={cn(
                "min-w-0 flex-1 rounded-sm border transition-all duration-150",
                size === "sm" ? "h-5" : "h-7",
                intensityClass(level, active),
                active && "scale-y-110",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
