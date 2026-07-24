"use client";

import {
  getYoAction,
  patchYoAction,
  prepareMissionBoardAction,
  refreshConsecrationAction,
} from "@/app/yo/actions";
import { ContinuousCalibrationForm } from "@/components/yo/continuous-calibration-form";
import { useGenesis } from "@/components/yo/genesis-context";
import { MissionBoard } from "@/components/yo/mission-board";
import { YoConduit } from "@/components/yo/yo-conduit";
import { YoGenesisTerminal } from "@/components/yo/yo-genesis-terminal";
import { YoStatusHud } from "@/components/yo/yo-status-hud";
import type { OperationalStatus, YoDto } from "@/lib/yo/types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function YoCommandCenter() {
  const { applyYo, yo: genesisYo } = useGenesis();
  const [yo, setYo] = useState<YoDto | null>(genesisYo);
  const [loading, setLoading] = useState(!genesisYo);
  const [saving, setSaving] = useState(false);
  const [nosceOpen, setNosceOpen] = useState(false);

  const syncYo = useCallback(
    (next: YoDto) => {
      setYo(next);
      applyYo(next);
    },
    [applyYo],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getYoAction();
    if (!result.ok) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    let next = result.data;
    if (next.genesisStatus === "PENDING_MISSIONS") {
      const prepared = await prepareMissionBoardAction();
      if (prepared.ok) next = prepared.data;
    }

    syncYo(next);
    setLoading(false);
  }, [syncYo]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (genesisYo) setYo(genesisYo);
  }, [genesisYo]);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      const result = await patchYoAction(body);
      setSaving(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      syncYo(result.data);
    },
    [syncYo],
  );

  const refreshMissions = useCallback(async () => {
    const result = await refreshConsecrationAction();
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    syncYo(result.data);
  }, [syncYo]);

  if (loading || !yo) {
    return (
      <div className="genesis-void-root flex items-center justify-center px-4 py-24">
        <p className="font-display text-sm tracking-[0.28em] text-legion-bronze uppercase">
          Inicializando Nodo Yo…
        </p>
      </div>
    );
  }

  if (yo.genesisStatus === "PENDING_NAMES") {
    return (
      <YoGenesisTerminal
        yo={yo}
        onComplete={(next) => {
          syncYo(next);
        }}
      />
    );
  }

  if (yo.genesisStatus === "PENDING_MISSIONS") {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-zinc-950 p-6 font-mono text-amber-100">
        <YoStatusHud
          yo={yo}
          saving={saving}
          compact
          energyUnlocked={false}
          onStatusChange={(status: OperationalStatus) => {
            void patch({ operationalStatus: status });
          }}
          onEnergyChange={(level: number) => {
            void patch({ energyLevel: level });
          }}
        />

        <p className="mt-5 shrink-0 font-display text-base leading-snug tracking-[0.02em] text-amber-100/90 md:text-lg">
          Para comenzar a entender Deprocast, Deprocast debe entenderte primero.
        </p>

        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <MissionBoard
            consecration={yo.consecration}
            nosceOpen={nosceOpen}
            onNosceOpenChange={setNosceOpen}
            onNosceCompleted={(next) => {
              syncYo(next);
              toast.success("Misión I sellada. El Senado espera.");
            }}
            onProgress={refreshMissions}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="yo-noir-root px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <YoStatusHud
          yo={yo}
          saving={saving}
          energyUnlocked
          onStatusChange={(status: OperationalStatus) => {
            void patch({ operationalStatus: status });
          }}
          onEnergyChange={(level: number) => {
            void patch({ energyLevel: level });
          }}
        />

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <YoConduit yo={yo} onYoUpdate={syncYo} />
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
