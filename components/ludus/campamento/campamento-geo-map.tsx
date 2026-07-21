"use client";

import { useBabel } from "@/components/babel/babel-context";
import { Button } from "@/components/ui/button";
import type { GeoMapSnapshot } from "@/lib/geo/types";
import { cn } from "@/lib/utils";
import { CheckIcon, Loader2Icon, MapPinIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const MapInner = dynamic(
  () =>
    import("@/components/ludus/campamento/campamento-geo-map-inner").then(
      (m) => m.CampamentoGeoMapInner,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Cargando terreno…
      </div>
    ),
  },
);

type Props = {
  fromIso: string;
  toIso: string;
  onActionDone?: () => void;
};

export function CampamentoGeoMap({ fromIso, toIso, onActionDone }: Props) {
  const { universeFetch, bumpTemporal } = useBabel();
  const [snapshot, setSnapshot] = useState<GeoMapSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeMode, setRangeMode] = useState<"today" | "range">("range");
  const [busyId, setBusyId] = useState<string | null>(null);

  const effectiveRange = useMemo(() => {
    if (rangeMode === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    return { from: fromIso, to: toIso };
  }, [rangeMode, fromIso, toIso]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        from: effectiveRange.from,
        to: effectiveRange.to,
      });
      const response = await universeFetch(
        `/api/campamento/geo?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        snapshot?: GeoMapSnapshot;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el mapa.");
      }
      setSnapshot(data.snapshot ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de carga.");
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }, [universeFetch, effectiveRange.from, effectiveRange.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleComplete = async (
    blockKind: "task" | "event",
    blockId: string,
  ) => {
    setBusyId(blockId);
    try {
      if (blockKind === "task") {
        const response = await universeFetch(`/api/pendientes/${blockId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete" }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo completar la tarea.");
        }
        toast.success("Tarea completada desde el mapa.");
      } else {
        const response = await universeFetch(`/api/events/${blockId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo confirmar el evento.");
        }
        toast.success("Evento confirmado desde el mapa.");
      }
      bumpTemporal();
      await load();
      onActionDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al completar.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ludus-geo-map flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-primary/20 bg-card/80">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <MapPinIcon className="size-3.5 text-primary/80" />
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary/70">
          Terreno real
        </p>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={() => setRangeMode("today")}
            className={cn(
              "rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
              rangeMode === "today"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-muted-foreground",
            )}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setRangeMode("range")}
            className={cn(
              "rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
              rangeMode === "range"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-muted-foreground",
            )}
          >
            Esta semana
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Cartografiando…
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-destructive">
            <p>{error}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
              Reintentar
            </Button>
          </div>
        ) : snapshot ? (
          <MapInner
            snapshot={snapshot}
            busyId={busyId}
            onComplete={handleComplete}
          />
        ) : null}
      </div>

      {snapshot ? (
        <div className="flex shrink-0 gap-3 border-t border-border px-3 py-2 font-mono text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-accent/80" />
            Permanentes · {snapshot.permanent.length}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-primary/80" />
            Temporales · {snapshot.temporal.length}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
            <CheckIcon className="size-3" />
            HITL desde popup
          </span>
        </div>
      ) : null}
    </div>
  );
}
