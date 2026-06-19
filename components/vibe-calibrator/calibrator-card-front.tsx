"use client";

import type { VibeCalibrationCard } from "./types";
import { WeightSlider } from "./weight-slider";
import { cn } from "@/lib/utils";

type CalibratorCardFrontProps = {
  card: VibeCalibrationCard;
  defaultWeight: number;
  onRelease: (weight: number) => void;
  disabled?: boolean;
  isExiting?: boolean;
};

export function CalibratorCardFront({
  card,
  defaultWeight,
  onRelease,
  disabled = false,
  isExiting = false,
}: CalibratorCardFrontProps) {
  return (
    <div
      className={cn(
        "calibrator-card-face flex min-h-[22rem] flex-col rounded-2xl bg-card p-8 ring-1 ring-foreground/10",
        isExiting && "animate-out fade-out slide-out-to-right duration-300",
        !isExiting && "animate-in fade-in slide-in-from-left duration-300",
      )}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {card.title}
          </h2>
          {card.description ? (
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              {card.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-auto pt-6">
        <WeightSlider
          key={card.id}
          defaultValue={defaultWeight}
          onRelease={onRelease}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
