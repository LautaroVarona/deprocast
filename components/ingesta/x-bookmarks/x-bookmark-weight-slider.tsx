"use client";

import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";
import { cn } from "@/lib/utils";

type XBookmarkWeightSliderProps = {
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

export function XBookmarkWeightSlider({
  value,
  onChange,
  onCommit,
  disabled = false,
  className,
}: XBookmarkWeightSliderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-center">
        <span className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-white">
          {value}
        </span>
      </div>

      <div className="relative px-1">
        <div className="mb-2 flex justify-between font-mono text-[9px] text-white/40">
          {Array.from({ length: MAX_BASE_WEIGHT }, (_, index) => (
            <span key={index + 1} className="w-4 text-center tabular-nums">
              {index + 1}
            </span>
          ))}
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
          className="x-bookmark-slider h-2 w-full cursor-pointer disabled:opacity-50"
          aria-label="Puntaje de calibración 1 a 12"
        />
      </div>

      <div className="flex justify-center gap-3 font-mono text-[10px] text-white/50">
        <span>
          <kbd className="rounded border border-white/20 px-1">1-9</kbd> directo
        </span>
        <span>
          <kbd className="rounded border border-white/20 px-1">Q</kbd>=10
        </span>
        <span>
          <kbd className="rounded border border-white/20 px-1">W</kbd>=11
        </span>
        <span>
          <kbd className="rounded border border-white/20 px-1">E</kbd>=12
        </span>
      </div>
    </div>
  );
}
