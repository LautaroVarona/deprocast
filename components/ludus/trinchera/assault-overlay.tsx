"use client";

import { FocalVisual } from "@/components/ludus/isochronic/focal-visual";
import { useTrincheraSession } from "@/components/ludus/trinchera/trinchera-session-context";
import { Button } from "@/components/ui/button";
import { buildBackgroundGradient } from "@/lib/trinchera/visual/session-store";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  HeadphonesIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { createPortal } from "react-dom";

type AssaultOverlayProps = {
  title: string;
  remainingSec: number;
  progress: number;
  isPlaying: boolean;
  tabVisible: boolean;
  isCompleting: boolean;
  modeLabel: string;
  onAbort: () => void;
  onComplete: () => void;
};

export function AssaultOverlay({
  title,
  remainingSec,
  progress,
  isPlaying,
  tabVisible,
  isCompleting,
  modeLabel,
  onAbort,
  onComplete,
}: AssaultOverlayProps) {
  const { visual, pulseVisual, breathingState, params, isPlaying: labPlaying } =
    useTrincheraSession();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const bgStyle = {
    background: buildBackgroundGradient(visual.backgroundColors),
  };

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]">
      <div
        className="relative flex h-[80%] w-[80%] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
        style={bgStyle}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.2)_2px,rgba(255,255,255,0.2)_3px)]" />

        <header className="relative shrink-0 space-y-1 border-b border-white/10 px-6 py-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
            Sesión en curso
          </p>
          <h2 className="text-lg font-medium text-white/95 sm:text-xl">{title}</h2>
          <p className="font-mono text-5xl font-light tabular-nums tracking-tight text-white sm:text-6xl">
            {formatTime(remainingSec)}
          </p>
          <div className="mx-auto mt-3 h-1 max-w-md overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(100, progress * 100)}%`,
                background: `linear-gradient(90deg, ${visual.figureColors.join(", ")})`,
              }}
            />
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-6 py-4">
          <FocalVisual
            shape={visual.shape}
            motionMode={visual.motionMode}
            figureColors={visual.figureColors}
            backgroundColors={visual.backgroundColors}
            pulseVisual={pulseVisual}
            isPlaying={labPlaying}
            pulseHz={params.mode === "isochronic" ? params.pulseHz : undefined}
            breathingState={
              params.mode === "meditative" ? breathingState : null
            }
            showPulseLabel={false}
            size="lg"
          />
        </div>

        <footer className="relative shrink-0 space-y-3 border-t border-white/10 px-6 py-4">
          <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-[10px]">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1",
                isPlaying
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 text-white/40",
              )}
            >
              <HeadphonesIcon className="size-3" />
              {modeLabel} {isPlaying ? "activo" : "—"}
            </span>
            <span className={tabVisible ? "text-white/35" : "text-rose-300/80"}>
              {tabVisible
                ? "Mantené la pestaña abierta"
                : "⚠ Pestaña oculta — sin recompensa"}
            </span>
          </div>

          <div className="flex justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isCompleting}
              className="border-white/15 text-white/70"
              onClick={onAbort}
            >
              <XIcon className="size-4" />
              Abortar
            </Button>
            <Button
              type="button"
              disabled={isCompleting}
              className="bg-emerald-600/90 hover:bg-emerald-500"
              onClick={onComplete}
            >
              {isCompleting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="size-4" />
              )}
              Completar
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
