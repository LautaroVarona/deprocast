"use client";

import { ContinuousCalibrationForm } from "@/components/yo/continuous-calibration-form";
import { YoConduit } from "@/components/yo/yo-conduit";
import { YoGenesisTerminal } from "@/components/yo/yo-genesis-terminal";
import { YoStatusHud } from "@/components/yo/yo-status-hud";
import { getYoAction, patchYoAction } from "@/app/yo/actions";
import type { OperationalStatus, YoDto } from "@/lib/yo/types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function YoCommandCenter() {
  const [yo, setYo] = useState<YoDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getYoAction();
    if (!result.ok) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    setYo(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback(async (body: Record<string, unknown>) => {
    setSaving(true);
    const result = await patchYoAction(body);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setYo(result.data);
  }, []);

  if (loading || !yo) {
    return (
      <div className="genesis-void-root flex items-center justify-center px-4 py-24">
        <p className="font-display text-sm tracking-[0.28em] text-legion-bronze uppercase">
          Inicializando Nodo Yo…
        </p>
      </div>
    );
  }

  if (!yo.genesisCompleted) {
    return (
      <YoGenesisTerminal
        yo={yo}
        onComplete={(next) => {
          setYo(next);
        }}
      />
    );
  }

  return (
    <div className="yo-noir-root px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <YoStatusHud
          yo={yo}
          saving={saving}
          onStatusChange={(status: OperationalStatus) => {
            void patch({ operationalStatus: status });
          }}
          onEnergyChange={(level: number) => {
            void patch({ energyLevel: level });
          }}
        />

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <YoConduit yo={yo} />
          <ContinuousCalibrationForm
            yo={yo}
            calibration={yo.calibration}
            disabled={saving}
            onSubmitAnswer={async (promptId, answer) => {
              await patch({
                calibrationEntry: { promptId, answer },
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
