"use client";

import { useBabel } from "@/components/babel/babel-context";
import { AsaltoChip } from "@/components/grid/asalto-chip";
import type { AsaltoItem } from "@/lib/pendientes/asaltos";
import type { PendingTaskDto } from "@/lib/pendientes/types";
import { Loader2Icon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type TrincheraDayFocusProps = {
  onRefreshSnapshot: () => void;
};

type PendingResponse = { tasks?: PendingTaskDto[] };
type AssaultResponse = { asaltos?: AsaltoItem[] };

export function TrincheraDayFocus({ onRefreshSnapshot }: TrincheraDayFocusProps) {
  const { selectedDay, universeFetch, temporalVersion } = useBabel();
  const [requiredTasks, setRequiredTasks] = useState<PendingTaskDto[]>([]);
  const [suggestedTasks, setSuggestedTasks] = useState<PendingTaskDto[]>([]);
  const [asaltos, setAsaltos] = useState<AsaltoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [requiredRes, suggestedRes, assaultRes] = await Promise.all([
        universeFetch(
          `/api/pendientes?day=${selectedDay}&status=calibrated,recognized&allDays=false`,
          { cache: "no-store" },
        ),
        universeFetch(
          `/api/pendientes?day=${selectedDay}&status=suggested&allDays=false`,
          { cache: "no-store" },
        ),
        universeFetch(`/api/pendientes?day=${selectedDay}&asaltos=true`, {
          cache: "no-store",
        }),
      ]);
      const requiredData = (await requiredRes.json()) as PendingResponse;
      const suggestedData = (await suggestedRes.json()) as PendingResponse;
      const assaultData = (await assaultRes.json()) as AssaultResponse;
      setRequiredTasks(requiredData.tasks ?? []);
      setSuggestedTasks(suggestedData.tasks ?? []);
      setAsaltos(assaultData.asaltos ?? []);
    } catch {
      setRequiredTasks([]);
      setSuggestedTasks([]);
      setAsaltos([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDay, universeFetch]);

  useEffect(() => {
    void load();
  }, [load, temporalVersion]);

  const handleAsaltoStarted = useCallback(() => {
    onRefreshSnapshot();
  }, [onRefreshSnapshot]);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden border-r border-white/[0.06] bg-[#040405]">
      <header className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Foco diario</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
          Trinchera · Obligatorias, sugeridas y asaltos
        </p>
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-white/40">
          <Loader2Icon className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 xl:grid-cols-2">
          <article className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-rose-300" />
              <h3 className="text-sm font-medium text-white">Obligatorias</h3>
            </div>
            <ul className="space-y-2">
              {requiredTasks.length === 0 ? (
                <li className="text-xs text-white/50">No hay tareas obligatorias para este día.</li>
              ) : (
                requiredTasks.map((task) => (
                  <li key={task.id} className="rounded-md border border-white/10 bg-black/40 px-3 py-2">
                    <p className="text-sm text-white">{task.title}</p>
                    <p className="font-mono text-[10px] text-white/45">
                      {task.weight ? `Peso ${task.weight}` : "Sin peso"} · {task.status}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="mb-2 flex items-center gap-2">
              <SparklesIcon className="size-4 text-emerald-300" />
              <h3 className="text-sm font-medium text-white">Sugeridas</h3>
            </div>
            <ul className="space-y-2">
              {suggestedTasks.length === 0 ? (
                <li className="text-xs text-white/50">No hay sugerencias para este día.</li>
              ) : (
                suggestedTasks.map((task) => (
                  <li key={task.id} className="rounded-md border border-white/10 bg-black/40 px-3 py-2">
                    <p className="text-sm text-white">{task.title}</p>
                    <p className="font-mono text-[10px] text-white/45">{task.source}</p>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article className="xl:col-span-2 rounded-xl border border-white/10 bg-black/30 p-3">
            <h3 className="mb-2 text-sm font-medium text-white">Asaltos disponibles</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {asaltos.length === 0 ? (
                <p className="text-xs text-white/50">Sin asaltos. Calibrá tareas en Pendientes.</p>
              ) : (
                asaltos.map((asalto) => (
                  <AsaltoChip key={asalto.id} asalto={asalto} onStarted={handleAsaltoStarted} />
                ))
              )}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
