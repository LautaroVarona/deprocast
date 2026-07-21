"use client";

import { AsaltoChip } from "@/components/grid/asalto-chip";
import { useBabel } from "@/components/babel/babel-context";
import type { AsaltoItem } from "@/lib/pendientes/asaltos";
import { ShieldIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function TrincheraSection() {
  const {
    universeFetch,
    temporalVersion,
    isLoading: isUniverseLoading,
  } = useBabel();
  const [asaltos, setAsaltos] = useState<AsaltoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await universeFetch(
        "/api/pendientes?day=today&asaltos=true",
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("trinchera");
      const data = await response.json();
      setAsaltos(data.asaltos ?? []);
    } catch {
      setAsaltos([]);
    } finally {
      setIsLoading(false);
    }
  }, [universeFetch]);

  useEffect(() => {
    if (isUniverseLoading) return;
    void load();
  }, [load, isUniverseLoading, temporalVersion]);

  return (
    <section className="hud-noir-panel flex min-h-0 flex-1 flex-col overflow-hidden p-4">
      <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldIcon className="size-4 text-accent" />
          <div>
            <p className="font-mono text-[10px] tracking-[0.24em] text-accent uppercase">
              La Trinchera
            </p>
            <h2 className="text-sm font-medium text-foreground">
              Asaltos prioritarios del día
            </h2>
          </div>
        </div>
        <Link
          href="/ludus/trinchera"
          className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase hover:text-accent"
        >
          Ludus →
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {isLoading ? (
          <p className="font-mono text-xs text-muted-foreground">Cargando asaltos…</p>
        ) : asaltos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center font-mono text-xs text-muted-foreground">
            Sin asaltos calibrados. Cristalizá Quántomos en el Atanor para
            llenar la trinchera.
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
