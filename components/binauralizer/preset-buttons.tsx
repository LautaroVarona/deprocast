"use client";

import type { BinauralPreset } from "@/lib/binauralizer/types";
import { BINAURAL_PRESETS } from "@/lib/binauralizer/presets";
import { cn } from "@/lib/utils";

type PresetButtonsProps = {
  activePresetId: string | null;
  onSelectPreset: (preset: BinauralPreset) => void;
  disabled?: boolean;
};

export function PresetButtons({
  activePresetId,
  onSelectPreset,
  disabled = false,
}: PresetButtonsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {BINAURAL_PRESETS.map((preset) => {
        const isActive = activePresetId === preset.id;

        return (
          <button
            key={preset.id}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => onSelectPreset(preset)}
            className={cn(
              "group flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-all",
              "disabled:cursor-not-allowed disabled:opacity-40",
              isActive
                ? "border-accent/40 bg-accent/10 shadow-[0_0_20px_-8px_rgba(251,191,36,0.4)]"
                : "border-border bg-muted/40 hover:border-accent/25 hover:bg-accent/90/5",
            )}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                {preset.emoji}
              </span>
              <span
                className={cn(
                  "font-mono text-xs font-medium uppercase tracking-wider",
                  isActive ? "text-accent" : "text-muted-foreground",
                )}
              >
                {preset.label}
              </span>
            </span>
            <span className="font-mono text-[10px] leading-relaxed text-muted-foreground">
              {preset.subtitle}
            </span>
          </button>
        );
      })}
    </div>
  );
}
