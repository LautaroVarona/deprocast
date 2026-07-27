"use client";

import {
  MAGO3_PHASE_LABELS,
  MAGO3_PHASES,
  type Mago3Phase,
} from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type ClockState = {
  mago12: number;
  mago3: Mago3Phase;
};

type MagoClockHudProps = {
  className?: string;
  /** Si true, permite ciclar turno/fase con click. */
  editable?: boolean;
};

export function MagoClockHud({
  className,
  editable = true,
}: MagoClockHudProps) {
  const [clock, setClock] = useState<ClockState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/yo/clock", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo cargar el reloj.");
      const data = (await response.json()) as {
        mago12?: number;
        mago3?: string;
      };
      const mago3 =
        typeof data.mago3 === "string" &&
        (MAGO3_PHASES as readonly string[]).includes(data.mago3)
          ? (data.mago3 as Mago3Phase)
          : "cuerpo";
      setClock({
        mago12:
          typeof data.mago12 === "number"
            ? Math.min(12, Math.max(1, data.mago12))
            : 1,
        mago3,
      });
    } catch {
      setClock({ mago12: 1, mago3: "cuerpo" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patchClock = useCallback(
    async (next: Partial<ClockState>) => {
      if (!clock || saving) return;
      setSaving(true);
      try {
        const response = await fetch("/api/yo/clock", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        const data = (await response.json()) as {
          error?: string;
          mago12?: number;
          mago3?: Mago3Phase;
        };
        if (!response.ok) throw new Error(data.error ?? "Fallo al actualizar.");
        setClock({
          mago12: data.mago12 ?? clock.mago12,
          mago3: data.mago3 ?? clock.mago3,
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "No se pudo actualizar el reloj.",
        );
      } finally {
        setSaving(false);
      }
    },
    [clock, saving],
  );

  if (loading || !clock) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground",
          className,
        )}
      >
        <Loader2Icon className="size-3 animate-spin" />
        Reloj…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5",
        className,
      )}
      title="Reloj operativo Magos (Yo) — independiente de Ludus"
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary/70">
        Magos
      </span>
      {editable ? (
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void patchClock({
              mago12: clock.mago12 >= 12 ? 1 : clock.mago12 + 1,
            })
          }
          className="font-mono text-[11px] text-foreground hover:text-primary disabled:opacity-50"
        >
          Ciclo: {clock.mago12}
        </button>
      ) : (
        <span className="font-mono text-[11px] text-foreground">
          Ciclo: {clock.mago12}
        </span>
      )}
      <span className="text-muted-foreground">|</span>
      {editable ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            const idx = MAGO3_PHASES.indexOf(clock.mago3);
            const next = MAGO3_PHASES[(idx + 1) % MAGO3_PHASES.length];
            void patchClock({ mago3: next });
          }}
          className="font-mono text-[11px] text-foreground hover:text-primary disabled:opacity-50"
        >
          Fase: {MAGO3_PHASE_LABELS[clock.mago3]}
        </button>
      ) : (
        <span className="font-mono text-[11px] text-foreground">
          Fase: {MAGO3_PHASE_LABELS[clock.mago3]}
        </span>
      )}
    </div>
  );
}
