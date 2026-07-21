"use client";

import { useBabel } from "@/components/babel/babel-context";
import { cn } from "@/lib/utils";
import { RadarIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function AtanorRadar() {
  const { universeFetch, temporalVersion, isLoading: isUniverseLoading } =
    useBabel();
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await universeFetch("/api/pendientes?status=suggested", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("radar");
      const data = await response.json();
      setPendingCount((data.tasks ?? []).length);
    } catch {
      setPendingCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [universeFetch]);

  useEffect(() => {
    if (isUniverseLoading) return;
    void load();
  }, [load, isUniverseLoading, temporalVersion]);

  return (
    <aside className="hud-noir-panel flex flex-col justify-between p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 items-center justify-center rounded-md border border-accent/25 bg-accent/10 text-accent">
          <RadarIcon className="size-4" />
        </span>
        <div>
          <p className="font-mono text-[10px] tracking-[0.24em] text-accent uppercase">
            Radar del Atanor
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quántomos pendientes de HITL
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <p
            className={cn(
              "font-mono text-4xl tabular-nums tracking-tight text-accent",
              isLoading && "animate-pulse text-muted-foreground",
            )}
          >
            {isLoading ? "—" : pendingCount}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground uppercase">
            nodos en cola
          </p>
        </div>
        <Link
          href="/pendientes"
          className="rounded-md border border-accent/30 px-3 py-1.5 font-mono text-[10px] tracking-wider text-accent/90 uppercase transition-colors hover:bg-accent/10"
        >
          Abrir Atanor →
        </Link>
      </div>
    </aside>
  );
}
