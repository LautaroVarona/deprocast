"use client";

import { cn } from "@/lib/utils";
import { BLOQUE_GLOW } from "@/lib/jornada/constants";
import type { BloquePrioridad } from "@/lib/jornada/types";

type EnergyBarProps = {
  progress: number;
  currency: number;
  activeBloque: BloquePrioridad | null;
};

export function EnergyBar({ progress, currency, activeBloque }: EnergyBarProps) {
  return (
    <div className="jornada-noir-panel space-y-3 p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
            Energía de la Jornada
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
            {progress}
            <span className="text-base text-white/50">%</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
            Divisa interna
          </p>
          <p className="mt-1 font-mono text-lg tabular-nums text-amber-200">
            {currency.toFixed(2)}
            <span className="ml-1 text-xs text-white/40">Y/Z</span>
          </p>
        </div>
      </div>

      <div className="relative h-3 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
        <div
          className={cn(
            "jornada-energy-fill absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500/80 via-amber-300 to-white",
            activeBloque && BLOQUE_GLOW[activeBloque],
          )}
          style={{ width: `${progress}%` }}
        />
        <div className="jornada-energy-shimmer pointer-events-none absolute inset-0" />
      </div>

      <p className="font-mono text-[11px] text-white/40">
        3 Prioridades Doradas · Ley del Mínimo Esfuerzo activa
      </p>
    </div>
  );
}
