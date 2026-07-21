"use client";

import type { VibeCalibrationCard, VibeCalibrationVotePayload } from "./types";
import { CalibratorCardBack } from "./calibrator-card-back";
import { CalibratorCardFront } from "./calibrator-card-front";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HistoryIcon } from "lucide-react";

type CalibratorCardProps = {
  card: VibeCalibrationCard;
  votes: VibeCalibrationVotePayload[];
  defaultWeight: number;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  onRelease: (weight: number) => void;
  disabled?: boolean;
  isExiting?: boolean;
};

export function CalibratorCard({
  card,
  votes,
  defaultWeight,
  isHistoryOpen,
  onToggleHistory,
  onRelease,
  disabled = false,
  isExiting = false,
}: CalibratorCardProps) {
  return (
    <div className="calibrator-card-scene w-full max-w-lg">
      <div
        className={cn(
          "calibrator-card-inner relative min-h-[22rem]",
          isHistoryOpen && "is-flipped",
        )}
      >
        {!isHistoryOpen ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3 z-10 opacity-40 hover:opacity-100"
            onClick={onToggleHistory}
            aria-label="Ver historial de votos"
          >
            <HistoryIcon className="size-4" />
          </Button>
        ) : null}

        <CalibratorCardFront
          card={card}
          defaultWeight={defaultWeight}
          onRelease={onRelease}
          disabled={disabled || isHistoryOpen}
          isExiting={isExiting}
          originSynced={isExiting}
        />

        <CalibratorCardBack votes={votes} onClose={onToggleHistory} />
      </div>
    </div>
  );
}
