"use client";

import { HermeticScale } from "@/components/pendientes/hermetic-scale";
import {
  OPERATIONAL_STATUSES,
  type OperatorProfileDto,
  type OperationalStatus,
} from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type OperatorProfileProps = {
  profile: OperatorProfileDto;
  onStatusChange: (status: OperationalStatus) => void;
  onEnergyChange: (level: number) => void;
  saving?: boolean;
};

export function OperatorProfile({
  profile,
  onStatusChange,
  onEnergyChange,
  saving = false,
}: OperatorProfileProps) {
  const [energyDraft, setEnergyDraft] = useState(profile.energyLevel);

  useEffect(() => {
    setEnergyDraft(profile.energyLevel);
  }, [profile.energyLevel]);

  return (
    <section className="yo-noir-panel space-y-6 p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.32em] text-accent uppercase">
            Nodo Cero · Operador
          </p>
          <h1 className="mt-2 font-mono text-3xl tracking-tight text-accent md:text-4xl">
            {profile.displayName}
          </h1>
          <p className="mt-2 max-w-xl font-mono text-xs leading-relaxed text-muted-foreground">
            Centro de mando del exoesqueleto. Aquí se calibra el soporte vital
            del sistema — no un formulario de registro.
          </p>
        </div>
        <div
          className={cn(
            "border border-accent/35 px-3 py-2 font-mono text-[10px] tracking-[0.2em] uppercase",
            saving ? "text-accent" : "text-accent",
          )}
        >
          {saving ? "[ SYNC… ]" : "[ ENLACE ESTABLE ]"}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <label className="font-mono text-[10px] tracking-[0.24em] text-accent uppercase">
            Estado operativo
          </label>
          <div className="flex flex-wrap gap-2">
            {OPERATIONAL_STATUSES.map((status) => {
              const active = profile.operationalStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  disabled={saving}
                  onClick={() => onStatusChange(status)}
                  className={cn(
                    "border px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] uppercase transition-colors",
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

        <div className="space-y-3">
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
