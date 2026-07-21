"use client";

import type { EcoPulseMetrics } from "@/lib/finanzas/types";

type SaasSemaphoreProps = {
  metrics: EcoPulseMetrics | null;
};

export function SaasSemaphore({ metrics }: SaasSemaphoreProps) {
  const subscriptions = metrics?.saas ?? [];
  const currency = metrics?.capital.currency ?? "EUR";

  const formatter = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });

  const monthlyTotal = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);

  return (
    <div className="finanzas-noir-panel rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Semáforo SaaS
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Tier terciario · suscripciones activas</p>
        </div>
        <span className="font-mono text-[10px] text-violet-400">
          {formatter.format(monthlyTotal)}/mes
        </span>
      </div>

      {subscriptions.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Sin suscripciones activas registradas.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {subscriptions.map((sub) => (
            <li
              key={sub.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-100">{sub.vendor}</p>
                <p className="truncate text-xs text-zinc-500">
                  {sub.projectLabel ?? "Sin proyecto"}
                  {sub.isRecurring ? " · recurrente" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className="size-2 rounded-full bg-emerald-400"
                  title="Activo"
                />
                <span className="font-mono text-sm tabular-nums text-violet-300">
                  {formatter.format(sub.amount)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
