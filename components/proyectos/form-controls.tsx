"use client";

import { cn } from "@/lib/utils";
import { MAX_BASE_WEIGHT, MIN_BASE_WEIGHT } from "@/lib/document-constants";
import type { ReactNode } from "react";

type ScaleSliderProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  accentClassName?: string;
};

export function ScaleSlider({
  id,
  label,
  value,
  onChange,
  accentClassName,
}: ScaleSliderProps) {
  const isHigh = value >= 10;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
            isHigh
              ? "bg-red-500/15 text-red-700 dark:text-red-200"
              : "bg-muted text-muted-foreground",
          )}
        >
          {value}/{MAX_BASE_WEIGHT}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={MIN_BASE_WEIGHT}
        max={MAX_BASE_WEIGHT}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn("w-full accent-primary", accentClassName)}
      />
    </div>
  );
}

type PercentSliderProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
};

export function PercentSlider({ id, label, value, onChange }: PercentSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {value}%
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

const inputClassName =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const textareaClassName =
  "w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function FormField({
  id,
  label,
  hint,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {hint ? (
          <span className="font-normal text-muted-foreground"> {hint}</span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

export { inputClassName, textareaClassName };
