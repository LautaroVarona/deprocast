"use client";

import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";
import { CALIBRATION_HOTKEY_HINTS } from "@/lib/ingesta/x-bookmarks/types";
import { vibeWeightTone } from "@/lib/ingesta/x-bookmarks/utils";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

type XBookmarkWeightSliderProps = {
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export function XBookmarkWeightSlider({
  value,
  onChange,
  onCommit,
  disabled = false,
  compact = false,
  className,
}: XBookmarkWeightSliderProps) {
  const tone = vibeWeightTone(value);
  const fillPercent = ((value - MIN_BASE_WEIGHT) / (MAX_BASE_WEIGHT - MIN_BASE_WEIGHT)) * 100;

  return (
    <div
      className={cn(
        "x-bookmark-noir-dock",
        compact ? "shrink-0 space-y-2.5 px-1 py-3 sm:px-2" : "space-y-3 p-4",
        className,
      )}
    >
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
            Puntaje de vibe
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            Elegí cuánto te resuena · Enter al soltar el slider
          </p>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "font-mono font-semibold tabular-nums tracking-tight transition-colors duration-150",
              compact ? "text-4xl" : "text-5xl",
              tone.className,
            )}
          >
            {value}
          </span>
          <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">{tone.label}</p>
        </div>
      </div>

      <div className="relative px-1">
        <div
          className={cn(
            "mb-1.5 flex justify-between font-mono",
            compact ? "text-[8px]" : "text-[10px]",
          )}
        >
          {Array.from({ length: MAX_BASE_WEIGHT }, (_, index) => {
            const tick = index + 1;
            const isActive = tick === value;
            return (
              <span
                key={tick}
                className={cn(
                  "w-4 text-center tabular-nums transition-colors",
                  isActive ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {tick}
              </span>
            );
          })}
        </div>
        <input
          type="range"
          min={MIN_BASE_WEIGHT}
          max={MAX_BASE_WEIGHT}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          onPointerUp={() => onCommit(value)}
          style={{
            background: `linear-gradient(to right, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.75) ${fillPercent}%, rgba(255,255,255,0.12) ${fillPercent}%, rgba(255,255,255,0.12) 100%)`,
          }}
          className="x-bookmark-slider h-2 w-full cursor-pointer disabled:opacity-50"
          aria-label="Puntaje de calibración 1 a 12"
        />
      </div>

      <div
        className={cn(
          "flex flex-wrap justify-center gap-1.5 font-mono text-muted-foreground",
          compact ? "text-[10px]" : "text-[10px]",
        )}
      >
        {CALIBRATION_HOTKEY_HINTS.map((hint) => (
          <span
            key={hint.label}
            className="rounded-full border border-border bg-foreground/[0.03] px-2 py-0.5"
          >
            <Kbd className="border-0 bg-transparent px-0 py-0 min-w-0">{hint.label}</Kbd>
            {hint.description === "puntaje directo"
              ? ` ${hint.description}`
              : ` → ${hint.description}`}
          </span>
        ))}
      </div>
    </div>
  );
}
