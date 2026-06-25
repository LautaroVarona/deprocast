"use client";

import type { Quanta } from "@/lib/cuadernos/types";
import { cn } from "@/lib/utils";

type QuantaOverlayProps = {
  quanta: Quanta[];
  visible: boolean;
};

export function QuantaOverlay({ quanta, visible }: QuantaOverlayProps) {
  if (!visible || quanta.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {quanta.map((quanto) => (
        <div
          key={quanto.id}
          className={cn(
            "absolute overflow-hidden rounded-sm border border-cyan-400/40",
            "bg-cyan-400/10 backdrop-blur-[1px]",
          )}
          style={{
            left: `${quanto.bbox.x * 100}%`,
            top: `${quanto.bbox.y * 100}%`,
            width: `${quanto.bbox.w * 100}%`,
            height: `${quanto.bbox.h * 100}%`,
          }}
        >
          <span
            className="block px-1 py-0.5 font-mono text-[9px] leading-tight text-cyan-100/90"
            style={{ fontSize: "clamp(7px, 1.2vw, 11px)" }}
          >
            {quanto.text}
          </span>
        </div>
      ))}
    </div>
  );
}
