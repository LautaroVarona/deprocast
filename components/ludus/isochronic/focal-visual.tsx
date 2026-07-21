"use client";

import { MandelbrotView } from "@/components/ludus/isochronic/mandelbrot-view";
import type { PulseVisualState } from "@/lib/trinchera/sound-lab/types";
import type { BreathingState } from "@/lib/trinchera/sound-lab/types";
import { BREATHING_PHASE_LABELS } from "@/lib/trinchera/sound-lab/types";
import {
  buildFigureGradient,
  buildBackgroundGradient,
} from "@/lib/trinchera/visual/session-store";
import type { FocalShape, MotionMode } from "@/lib/trinchera/visual/types";
import { cn } from "@/lib/utils";

type FocalVisualProps = {
  shape: FocalShape;
  motionMode: MotionMode;
  figureColors: string[];
  backgroundColors?: string[];
  pulseVisual: PulseVisualState;
  isPlaying: boolean;
  pulseHz?: number;
  showPulseLabel?: boolean;
  breathingState?: BreathingState | null;
  size?: "md" | "lg";
  className?: string;
};

const SHAPE_CLIP: Record<Exclude<FocalShape, "mandelbrot">, string> = {
  hexagon: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
  circle: "circle(50% at 50% 50%)",
  triangle: "polygon(50% 0%, 100% 100%, 0% 100%)",
  square: "polygon(8% 8%, 92% 8%, 92% 92%, 8% 92%)",
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
};

export function FocalVisual({
  shape,
  motionMode,
  figureColors,
  backgroundColors,
  pulseVisual,
  isPlaying,
  pulseHz,
  showPulseLabel = true,
  breathingState = null,
  size = "md",
  className,
}: FocalVisualProps) {
  const isBreathing = breathingState !== null;
  const scale = isBreathing
    ? breathingState.scale
    : isPlaying
      ? 0.88 + pulseVisual.intensity * 0.12
      : 1;
  const opacity = isBreathing
    ? 0.65 + (breathingState.scale - 0.82) * 1.2
    : isPlaying
      ? 0.55 + pulseVisual.intensity * 0.45
      : 0.75;
  const glowStrength = isBreathing
    ? 0.4 + breathingState.cycleProgress * 0.4
    : isPlaying
      ? pulseVisual.intensity
      : 0.25;
  const primaryColor = figureColors[0] ?? "#f43f5e";
  const figureGradient = buildFigureGradient(figureColors);
  const bgGradient = backgroundColors
    ? buildBackgroundGradient(backgroundColors)
    : undefined;

  const sizeClass =
    size === "lg"
      ? "h-full w-full max-h-[min(52vh,420px)] max-w-[min(52vh,420px)]"
      : "h-full w-full max-h-[min(38vh,300px)] max-w-[min(38vh,300px)]";

  const clipPath =
    shape !== "mandelbrot" ? SHAPE_CLIP[shape] : undefined;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        sizeClass,
        className,
      )}
      aria-hidden={!showPulseLabel}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-75"
        style={{
          opacity: glowStrength,
          background: `radial-gradient(circle at center, ${primaryColor}55, transparent 68%)`,
        }}
      />

      <div
        className={cn(
          "relative flex h-[78%] w-[78%] items-center justify-center will-change-transform",
          motionMode === "drift" && "focal-drift-motion",
        )}
        style={{
          transform: motionMode === "fixed" ? `scale(${scale})` : undefined,
          opacity,
          ["--focal-pulse-scale" as string]: scale,
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            clipPath,
            WebkitClipPath: clipPath,
            border: shape !== "mandelbrot" ? `1px solid ${primaryColor}88` : undefined,
            background:
              shape === "mandelbrot"
                ? "var(--background)"
                : `linear-gradient(155deg, color-mix(in oklch, var(--foreground) 6%, transparent), ${primaryColor}22, color-mix(in oklch, var(--background) 50%, transparent))`,
            boxShadow: `0 0 32px ${primaryColor}33, inset 0 0 0 1px color-mix(in oklch, var(--foreground) 5%, transparent)`,
          }}
        >
          {shape === "mandelbrot" ? (
            <MandelbrotView
              figureColors={figureColors}
              pulseVisual={pulseVisual}
              isPlaying={isPlaying}
              className="h-full w-full"
            />
          ) : (
            <div
              className="absolute inset-[10%]"
              style={{
                clipPath,
                WebkitClipPath: clipPath,
                background: bgGradient
                  ? `radial-gradient(circle at 50% 42%, color-mix(in oklch, var(--foreground) 8%, transparent), transparent 60%), ${bgGradient}`
                  : `radial-gradient(circle at 50% 42%, color-mix(in oklch, var(--foreground) 8%, transparent), transparent 60%)`,
              }}
            />
          )}

          {shape !== "mandelbrot" ? (
            <div
              className="absolute inset-[6%] opacity-80"
              style={{
                clipPath,
                WebkitClipPath: clipPath,
                background: figureGradient,
                mixBlendMode: "overlay",
                opacity: isPlaying ? 0.35 + pulseVisual.intensity * 0.45 : 0.2,
              }}
            />
          ) : null}
        </div>

        {showPulseLabel && isBreathing && breathingState ? (
          <div className="relative z-10 flex flex-col items-center gap-1 text-center">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.32em]"
              style={{ color: `${primaryColor}99` }}
            >
              {BREATHING_PHASE_LABELS[breathingState.phase]}
            </span>
            <span className="font-mono text-3xl font-light tabular-nums tracking-tight text-foreground">
              {breathingState.secondsLeft}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              seg
            </span>
            <svg
              className="mt-2 size-16"
              viewBox="0 0 100 100"
              aria-hidden
            >
              {(["inhale", "hold-in", "exhale", "hold-out"] as const).map(
                (phase, i) => {
                  const active = breathingState.phase === phase;
                  const positions = [
                    "M 50 8 L 92 50",
                    "M 92 50 L 50 92",
                    "M 50 92 L 8 50",
                    "M 8 50 L 50 8",
                  ];
                  return (
                    <path
                      key={phase}
                      d={positions[i]}
                      fill="none"
                      stroke={active ? primaryColor : "rgba(255,255,255,0.12)"}
                      strokeWidth={active ? 3 : 1.5}
                      strokeLinecap="round"
                      opacity={active ? 1 : 0.5}
                    />
                  );
                },
              )}
            </svg>
          </div>
        ) : showPulseLabel && pulseHz !== undefined ? (
          <div className="relative z-10 flex flex-col items-center gap-0.5 text-center">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.38em]"
              style={{ color: `${primaryColor}99` }}
            >
              Pulso
            </span>
            <span className="font-mono text-3xl font-light tabular-nums tracking-tight text-foreground">
              {pulseHz.toFixed(1)}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Hz
            </span>
          </div>
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute left-0 top-1/2 h-px w-8 -translate-y-1/2"
        style={{
          background: `linear-gradient(to right, transparent, ${primaryColor}55)`,
        }}
      />
      <div
        className="pointer-events-none absolute right-0 top-1/2 h-px w-8 -translate-y-1/2"
        style={{
          background: `linear-gradient(to left, transparent, ${primaryColor}55)`,
        }}
      />
    </div>
  );
}
