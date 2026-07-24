"use client";

import { HermeticScale } from "@/components/pendientes/hermetic-scale";
import {
  DEFAULT_EXOCORTEX_NAME,
  OPERATIONAL_STATUSES,
  type OperationalStatus,
  type YoDto,
} from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type YoStatusHudProps = {
  yo: YoDto;
  saving?: boolean;
  /** HUD minimalista para la Tabula de Misiones. */
  compact?: boolean;
  energyUnlocked?: boolean;
  onStatusChange: (status: OperationalStatus) => void;
  onEnergyChange: (level: number) => void;
};

export function YoStatusHud({
  yo,
  saving = false,
  compact = false,
  energyUnlocked = true,
  onStatusChange,
  onEnergyChange,
}: YoStatusHudProps) {
  const [energyDraft, setEnergyDraft] = useState(yo.energyLevel);

  useEffect(() => {
    setEnergyDraft(yo.energyLevel);
  }, [yo.energyLevel]);

  if (compact) {
    return (
      <section className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2.5">
          <div className="border border-amber-100/15 bg-black/40 px-3 py-2">
            <p className="font-mono text-[9px] tracking-[0.2em] text-amber-100/45 uppercase">
              Operador
            </p>
            <p className="mt-1 font-mono text-sm text-amber-100">
              {yo.operatorName ?? "—"}
            </p>
          </div>
          <div className="border border-amber-100/15 bg-black/40 px-3 py-2">
            <p className="font-mono text-[9px] tracking-[0.2em] text-amber-100/45 uppercase">
              Exocórtex
            </p>
            <p className="mt-1 font-mono text-sm text-amber-100">
              {yo.exocortexName ?? DEFAULT_EXOCORTEX_NAME}
            </p>
          </div>
        </div>
        <div className="animate-pulse border border-amber-100/30 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.2em] text-amber-100/90 uppercase">
          {saving ? "[ SYNC… ]" : `[ ${yo.operationalStatus} ]`}
        </div>
      </section>
    );
  }

  return (
    <section className="yo-noir-panel space-y-5 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.32em] text-accent uppercase">
            HUD · Constantes vitales
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="border border-accent/20 bg-black/25 px-3 py-2">
              <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
                Operador
              </p>
              <p className="mt-1 font-mono text-xl text-accent">
                {yo.operatorName}
              </p>
            </div>
            <div className="border border-accent/20 bg-black/25 px-3 py-2">
              <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
                Exocórtex
              </p>
              <p className="mt-1 font-mono text-xl text-accent">
                {yo.exocortexName ?? DEFAULT_EXOCORTEX_NAME}
              </p>
              {yo.exocortexNamedBy === "autonomous" ? (
                <p className="mt-1 font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase">
                  auto-asignado
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="border border-accent/35 px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-accent uppercase">
          {saving ? "[ SYNC… ]" : `[ ${yo.operationalStatus} ]`}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="font-mono text-[10px] tracking-[0.24em] text-accent uppercase">
            Estado operativo
          </label>
          <div className="flex flex-wrap gap-2">
            {OPERATIONAL_STATUSES.map((status) => {
              const active = yo.operationalStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  disabled={saving}
                  onClick={() => onStatusChange(status)}
                  className={cn(
                    "border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors",
                    active
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-muted-foreground hover:border-accent/40 hover:text-accent",
                  )}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-mono text-[10px] tracking-[0.24em] text-accent uppercase">
            Nivel de energía
          </label>
          {energyUnlocked ? (
            <HermeticScale
              value={energyDraft}
              onChange={setEnergyDraft}
              onCommit={onEnergyChange}
              disabled={saving}
              size="md"
            />
          ) : (
            <p className="border border-dashed border-accent/25 bg-black/20 px-3 py-3 font-mono text-[11px] text-muted-foreground">
              Telemetría sellada. Completá Nosce Te Ipsum.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
