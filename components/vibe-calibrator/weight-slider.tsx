"use client";

import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type WeightSliderProps = {
  defaultValue?: number;
  onRelease: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

export function WeightSlider({
  defaultValue = 6,
  onRelease,
  disabled = false,
  className,
}: WeightSliderProps) {
  const [draft, setDraft] = useState(defaultValue);
  const [isDragging, setIsDragging] = useState(false);
  const releasedRef = useRef(false);

  useEffect(() => {
    setDraft(defaultValue);
    releasedRef.current = false;
  }, [defaultValue]);

  const handleRelease = (value: number) => {
    if (disabled || releasedRef.current) return;
    releasedRef.current = true;
    setIsDragging(false);
    onRelease(value);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "text-center tabular-nums transition-all duration-200",
          isDragging
            ? "text-4xl font-semibold tracking-tight text-foreground"
            : "text-sm text-muted-foreground/0",
        )}
        aria-hidden={!isDragging}
      >
        {draft}
      </div>

      <div className="flex items-center gap-3">
        <span className="w-4 shrink-0 text-center font-mono text-xs tabular-nums text-muted-foreground">
          {MIN_BASE_WEIGHT}
        </span>
        <input
          type="range"
          min={MIN_BASE_WEIGHT}
          max={MAX_BASE_WEIGHT}
          step={1}
          value={draft}
          disabled={disabled}
          onChange={(event) => {
            setDraft(Number(event.target.value));
            setIsDragging(true);
          }}
          onPointerDown={() => {
            releasedRef.current = false;
            setIsDragging(true);
          }}
          onPointerUp={() => handleRelease(draft)}
          onKeyUp={(event) => {
            if (event.key === "Enter") handleRelease(draft);
          }}
          className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Peso de calibración"
          aria-valuemin={MIN_BASE_WEIGHT}
          aria-valuemax={MAX_BASE_WEIGHT}
          aria-valuenow={draft}
        />
        <span className="w-6 shrink-0 text-center font-mono text-xs tabular-nums text-muted-foreground">
          {MAX_BASE_WEIGHT}
        </span>
      </div>
    </div>
  );
}
