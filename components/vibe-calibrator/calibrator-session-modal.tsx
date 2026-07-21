"use client";

import { useCalibrator } from "./calibrator-context";
import { CalibratorCard } from "./calibrator-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

export function CalibratorSessionModal() {
  const { state, currentCard, defaultWeight, commitVote, endSession, dispatch } =
    useCalibrator();

  const handleClose = useCallback(async () => {
    if (
      state.status === "active" &&
      state.votes.length > 0 &&
      !window.confirm("¿Cerrar la sesión? Los votos ya guardados se conservan.")
    ) {
      return;
    }
    await endSession();
  }, [state.status, state.votes.length, endSession]);

  useEffect(() => {
    if (!state.isModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      void handleClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.isModalOpen, handleClose]);

  if (!state.isModalOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sesión de calibración"
    >
      <button
        type="button"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-md"
        onClick={() => void handleClose()}
        aria-label="Cerrar sesión"
      />

      <div className="relative z-10 w-full max-w-lg">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "absolute -top-10 right-0 text-primary-foreground/70 hover:bg-muted/50 hover:text-primary-foreground",
            state.status === "completed" && "top-0 right-0 text-foreground",
          )}
          onClick={() => void handleClose()}
          aria-label="Cerrar"
        >
          <XIcon className="size-4" />
        </Button>

        {state.status === "completed" ? (
          <div className="animate-in fade-in zoom-in-95 rounded-2xl bg-card p-10 text-center ring-1 ring-foreground/10 duration-300">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Sesión completa
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {state.votes.length} voto{state.votes.length === 1 ? "" : "s"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Calibración registrada en la base de datos.
            </p>
            <Button
              type="button"
              className="mt-8"
              onClick={() => void endSession()}
            >
              Cerrar sesión
            </Button>
          </div>
        ) : currentCard ? (
          <CalibratorCard
            card={currentCard}
            votes={state.votes}
            defaultWeight={defaultWeight}
            isHistoryOpen={state.isHistoryOpen}
            onToggleHistory={() => dispatch({ type: "TOGGLE_HISTORY" })}
            onRelease={(weight) => void commitVote(weight)}
            disabled={state.isTransitioning}
            isExiting={state.isTransitioning}
          />
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
