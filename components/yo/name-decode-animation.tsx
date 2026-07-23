"use client";

import { useEffect, useState } from "react";

const GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·░▒▓█æøåþßµΩΨΣΞ#@$%&*<>/\\|";

type NameDecodeAnimationProps = {
  finalName: string;
  active: boolean;
  onComplete?: () => void;
  durationMs?: number;
};

export function NameDecodeAnimation({
  finalName,
  active,
  onComplete,
  durationMs = 2200,
}: NameDecodeAnimationProps) {
  const [display, setDisplay] = useState("");
  const [phase, setPhase] = useState<"idle" | "decoding" | "locked">("idle");

  useEffect(() => {
    if (!active || !finalName) {
      setPhase("idle");
      setDisplay("");
      return;
    }

    setPhase("decoding");
    const target = finalName;
    const started = performance.now();
    let frame = 0;
    let raf = 0;

    const tick = (now: number) => {
      frame += 1;
      const progress = Math.min(1, (now - started) / durationMs);
      const revealCount = Math.floor(progress * target.length);

      const next = Array.from({ length: target.length }, (_, index) => {
        if (index < revealCount) return target[index];
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }).join("");

      setDisplay(next);

      if (progress < 1) {
        raf = window.requestAnimationFrame(tick);
        return;
      }

      setDisplay(target);
      setPhase("locked");
      onComplete?.();
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [active, finalName, durationMs, onComplete]);

  if (!active && phase === "idle") return null;

  return (
    <div className="space-y-3 border border-accent/35 bg-black/40 p-4 font-mono">
      <p className="text-[10px] tracking-[0.28em] text-accent uppercase">
        {phase === "locked"
          ? "[ IDENTIDAD FIJADA ]"
          : "[ DECODIFICANDO FIRMA EXOCÓRTEX… ]"}
      </p>
      <p
        className="text-2xl tracking-[0.12em] text-accent md:text-3xl"
        aria-live="polite"
      >
        {display || "········"}
      </p>
      <div className="h-1 overflow-hidden bg-accent/15">
        <div
          className="h-full bg-accent/70 transition-[width] duration-100"
          style={{
            width: phase === "locked" ? "100%" : `${Math.min(98, display.length * 12)}%`,
          }}
        />
      </div>
    </div>
  );
}
