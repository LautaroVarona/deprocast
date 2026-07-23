"use client";

import { HermeticScale } from "@/components/pendientes/hermetic-scale";
import {
  OPERATIONAL_STATUSES,
  type OperationalStatus,
  type YoDto,
} from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type YoStatusHudProps = {
  yo: YoDto;
  saving?: boolean;
  onStatusChange: (status: OperationalStatus) => void;
  onEnergyChange: (level: number) => void;
};

export function YoStatusHud({
  yo,
  saving = false,
  onStatusChange,
  onEnergyChange,
}: YoStatusHudProps) {
  const [energyDraft, setEnergyDraft] = useState(yo.energyLevel);

  useEffect(() => {
    setEnergyDraft(yo.energyLevel);
  }, [yo.energyLevel]);

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
                {yo.exocortexName}
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
          <HermeticScale
            value={energyDraft}
            onChange={setEnergyDraft}
            onCommit={onEnergyChange}
            disabled={saving}
            size="md"
          />
        </div>
      </div>
    </section>
  );
}
