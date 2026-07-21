"use client";

import type { EcoPulseMetrics } from "@/lib/finanzas/types";

type BurnPulseProps = {
  metrics: EcoPulseMetrics | null;
};

export function BurnPulse({ metrics }: BurnPulseProps) {
  const vital = metrics?.burn.vitalMonthly ?? 0;
  const operational = metrics?.burn.operationalMonthly ?? 0;
  const ratio = metrics?.burn.ratio ?? 0;
  const currency = metrics?.capital.currency ?? "EUR";

  const formatter = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  const vitalPercent = operational > 0 ? (vital / operational) * 100 : vital > 0 ? 100 : 0;
  const discretionaryPercent = 100 - vitalPercent;

  return (
    <div className="finanzas-noir-panel rounded-xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        Pulso de burn rate
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Gasto mínimo vital vs operativo total del mes
      </p>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full">
        <div
          className="bg-amber-500/80 transition-all duration-500"
          style={{ width: `${vitalPercent}%` }}
          title={`Vital: ${formatter.format(vital)}`}
        />
        <div
          className="bg-zinc-600/60 transition-all duration-500"
          style={{ width: `${discretionaryPercent}%` }}
          title={`Discrecional: ${formatter.format(operational - vital)}`}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-amber-400/80">
            Vital
          </p>
          <p className="text-lg font-semibold tabular-nums text-zinc-100">
            {formatter.format(vital)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">
            Operativo
          </p>
          <p className="text-lg font-semibold tabular-nums text-zinc-100">
            {formatter.format(operational)}
          </p>
        </div>
      </div>

      <p className="mt-3 font-mono text-[9px] text-zinc-500">
        Ratio vital/operativo: {(ratio * 100).toFixed(0)}%
      </p>
    </div>
  );
}
