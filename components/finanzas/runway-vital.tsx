"use client";

import type { EcoPulseMetrics } from "@/lib/finanzas/types";

type RunwayVitalProps = {
  metrics: EcoPulseMetrics | null;
};

export function RunwayVital({ metrics }: RunwayVitalProps) {
  const months = metrics?.runway.months ?? 0;
  const vitalBurn = metrics?.runway.vitalMonthlyBurn ?? 0;
  const capital = metrics?.runway.capitalAmount ?? 0;

  const clampedMonths = Math.min(months, 24);
  const fillPercent = Math.min(100, (clampedMonths / 12) * 100);

  const statusColor =
    months >= 6 ? "text-emerald-400" : months >= 3 ? "text-amber-400" : "text-red-400";

  return (
    <div className="finanzas-noir-panel rounded-xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        Runway vital
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Meses cubiertos (capital ÷ necesarios + primarios)
      </p>

      <div className="mt-4 flex items-end gap-3">
        <span className={`text-4xl font-semibold tabular-nums ${statusColor}`}>
          {months.toFixed(1)}
        </span>
        <span className="mb-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          meses
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
          style={{ width: `${fillPercent}%` }}
        />
      </div>

      <div className="mt-3 flex justify-between font-mono text-[9px] text-zinc-500">
        <span>
          Capital:{" "}
          {new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: metrics?.capital.currency ?? "EUR",
          }).format(capital)}
        </span>
        <span>
          Burn vital/mes:{" "}
          {new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: metrics?.capital.currency ?? "EUR",
          }).format(vitalBurn)}
        </span>
      </div>
    </div>
  );
}
