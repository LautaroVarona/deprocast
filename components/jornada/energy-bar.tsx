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
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Energía de la Jornada
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {progress}
            <span className="text-base text-muted-foreground">%</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Divisa interna
          </p>
          <p className="mt-1 font-mono text-lg tabular-nums text-accent">
            {currency.toFixed(2)}
            <span className="ml-1 text-xs text-muted-foreground">Y/Z</span>
          </p>
        </div>
      </div>

      <div className="relative h-3 overflow-hidden rounded-full bg-muted/40 ring-1 ring-border">
        <div
          className={cn(
            "jornada-energy-fill absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent/80 via-accent/20 to-foreground",
            activeBloque && BLOQUE_GLOW[activeBloque],
          )}
          style={{ width: `${progress}%` }}
        />
        <div className="jornada-energy-shimmer pointer-events-none absolute inset-0" />
      </div>

      <p className="font-mono text-[11px] text-muted-foreground">
        3 Prioridades Doradas · Ley del Mínimo Esfuerzo activa
      </p>
    </div>
  );
}
