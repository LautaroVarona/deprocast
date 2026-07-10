"use client";

import { AsaltoChip } from "@/components/grid/asalto-chip";
import type { AsaltoItem } from "@/lib/pendientes/asaltos";
import type { DayOffset } from "@/lib/pendientes/types";
import { ShieldIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type TrincheraPanelProps = {
  selectedDay: DayOffset;
};

export function TrincheraPanel({ selectedDay }: TrincheraPanelProps) {
  const [asaltos, setAsaltos] = useState<AsaltoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/pendientes?day=${selectedDay}&asaltos=true`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Error al cargar asaltos.");
      const data = await response.json();
      setAsaltos(data.asaltos ?? []);
    } catch {
      setAsaltos([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDay]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2">
      <header className="mb-2 flex shrink-0 items-center gap-2">
        <ShieldIcon className="size-4 text-rose-300/80" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
            Trinchera
          </p>
          <h2 className="text-sm font-medium text-white">Asaltos del día</h2>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {isLoading ? (
          <p className="font-mono text-xs text-white/30">Cargando asaltos…</p>
        ) : asaltos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center font-mono text-xs text-white/35">
            Sin asaltos para este día. Reconocé y calibrá tareas en Pendientes.
          </p>
        ) : (
          asaltos.map((asalto) => (
            <AsaltoChip key={asalto.id} asalto={asalto} onStarted={load} />
          ))
        )}
      </div>
    </section>
  );
}
