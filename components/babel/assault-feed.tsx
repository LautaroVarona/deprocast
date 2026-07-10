"use client";

import { AsaltoChip } from "@/components/grid/asalto-chip";
import { useBabel } from "@/components/babel/babel-context";
import type { AsaltoItem } from "@/lib/pendientes/asaltos";
import { ShieldIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function AssaultFeed() {
  const { selectedDay, activeUniverse } = useBabel();
  const [asaltos, setAsaltos] = useState<AsaltoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        day: selectedDay,
        asaltos: "true",
      });
      if (activeUniverse?.slug) {
        params.set("universe", activeUniverse.slug);
      }

      const response = await fetch(`/api/pendientes?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Error al cargar asaltos.");
      const data = await response.json();
      setAsaltos(data.asaltos ?? []);
    } catch {
      setAsaltos([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDay, activeUniverse?.slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const slots = Array.from({ length: 4 }, (_, index) => asaltos[index] ?? null);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2">
      <header className="mb-2 flex shrink-0 items-center gap-2">
        <ShieldIcon className="size-4 text-rose-500 dark:text-rose-300/80" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Trinchera
            {activeUniverse ? ` · ${activeUniverse.label}` : ""}
          </p>
          <h2 className="text-sm font-medium">Asaltos de la jornada</h2>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-4 gap-2 overflow-hidden">
        {isLoading ? (
          <p className="font-mono text-xs text-muted-foreground">Cargando asaltos…</p>
        ) : (
          slots.map((asalto, index) =>
            asalto ? (
              <AsaltoChip key={asalto.id} asalto={asalto} onStarted={load} />
            ) : (
              <div
                key={`empty-${index}`}
                className="flex items-center rounded-lg border border-dashed border-border px-3 py-2"
              >
                <p className="font-mono text-[10px] text-muted-foreground/60">
                  {index === 0 && asaltos.length === 0
                    ? "Sin asaltos. Reconocé y calibrá tareas en Pendientes."
                    : "Slot libre"}
                </p>
              </div>
            ),
          )
        )}
      </div>
    </section>
  );
}
