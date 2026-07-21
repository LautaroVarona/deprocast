"use client";

import { ContinuousCalibrationForm } from "@/components/yo/continuous-calibration-form";
import { OperatorProfile } from "@/components/yo/operator-profile";
import type {
  OperatorProfileDto,
  OperationalStatus,
} from "@/lib/yo/types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function YoCommandCenter() {
  const [profile, setProfile] = useState<OperatorProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/yo", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar /yo.");
      }
      setProfile(data.profile as OperatorProfileDto);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al cargar el Nodo Cero.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const patchProfile = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      try {
        const response = await fetch("/api/yo", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo sincronizar.");
        }
        setProfile(data.profile as OperatorProfileDto);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Fallo de sincronización del operador.",
        );
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  if (loading || !profile) {
    return (
      <div className="yo-noir-root flex items-center justify-center px-4 py-24">
        <p className="font-mono text-xs tracking-[0.28em] text-accent uppercase">
          [ INICIALIZANDO NODO CERO… ]
        </p>
      </div>
    );
  }

  return (
    <div className="yo-noir-root px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <OperatorProfile
          profile={profile}
          saving={saving}
          onStatusChange={(status: OperationalStatus) => {
            void patchProfile({ operationalStatus: status });
          }}
          onEnergyChange={(level: number) => {
            void patchProfile({ energyLevel: level });
          }}
        />
        <ContinuousCalibrationForm
          calibration={profile.calibration}
          disabled={saving}
          onSubmitAnswer={async (promptId, answer) => {
            await patchProfile({
              calibrationEntry: { promptId, answer },
            });
          }}
        />
      </div>
    </div>
  );
}
