"use client";

import type { VibeCalibrationVotePayload } from "./types";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

type CalibratorCardBackProps = {
  votes: VibeCalibrationVotePayload[];
  onClose: () => void;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CalibratorCardBack({ votes, onClose }: CalibratorCardBackProps) {
  const sorted = [...votes].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );

  return (
    <div className="calibrator-card-face calibrator-card-back flex h-full min-h-[22rem] flex-col rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Historial de sesión
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Volver a la card"
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {sorted.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted-foreground">
            Sin votos aún.
          </li>
        ) : (
          sorted.map((vote) => (
            <li
              key={`${vote.cardId}-${vote.timestamp.getTime()}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-foreground">
                {(vote.title ?? vote.cardId).slice(0, 40)}
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {formatTime(vote.timestamp)}
              </span>
              <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-primary">
                {vote.weight}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
