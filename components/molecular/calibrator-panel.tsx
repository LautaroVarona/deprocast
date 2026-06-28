"use client";

import { CalibrationRow } from "@/components/molecular/calibration-row";
import { useMolecular } from "@/components/molecular/molecular-context";
import { cn } from "@/lib/utils";
import { CrosshairIcon, Loader2Icon } from "lucide-react";

export function CalibratorPanel() {
  const {
    phase,
    calibraciones,
    validadas,
    isBusy,
    validateParticula,
  } = useMolecular();

  const visible =
    phase === "calibrating" ||
    phase === "validating" ||
    phase === "complete";

  const validatedIds = new Set(validadas.map((item) => item.id));
  const progress =
    calibraciones.length > 0
      ? Math.round((validadas.length / calibraciones.length) * 100)
      : 0;

  return (
    <section
      className={cn(
        "molecular-noir-panel flex flex-col gap-4 p-5 transition-all duration-700",
        visible ? "opacity-100" : "pointer-events-none opacity-30",
      )}
    >
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <CrosshairIcon className="size-4 text-violet-400/80" />
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
            Agente 02 · Calibrador Central
          </p>
        </div>
        <h2 className="font-mono text-lg text-white/90">
          Matriz de Geometría Sagrada
        </h2>
        <p className="text-xs text-white/45">
          Recalibrá los tres ejes antes de persistir. Currency Potencial = Y ÷ Z.
        </p>
      </header>

      {phase === "calibrating" ? (
        <div className="flex items-center gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3">
          <Loader2Icon className="size-4 animate-spin text-violet-400" />
          <p className="font-mono text-xs text-violet-300/80">
            Analizando partículas con IA simulada…
          </p>
        </div>
      ) : null}

      {calibraciones.length > 0 && phase !== "calibrating" ? (
        <>
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[10px] text-white/35">
              <span>Validación HITL</span>
              <span className="tabular-nums text-emerald-400/80">
                {validadas.length}/{calibraciones.length} · {progress}%
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500/70 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="max-h-[calc(100dvh-22rem)] space-y-3 overflow-y-auto pr-1">
            {calibraciones.map((item, index) => (
              <CalibrationRow
                key={item.id}
                item={item}
                index={index}
                validated={validatedIds.has(item.id)}
                disabled={isBusy}
                onValidate={(axes) => validateParticula(item.id, axes)}
              />
            ))}
          </div>
        </>
      ) : phase !== "calibrating" ? (
        <div className="rounded-lg border border-dashed border-white/10 px-4 py-10 text-center">
          <p className="font-mono text-xs text-white/30">
            Esperando partículas del Chunkeador…
          </p>
        </div>
      ) : null}

      {phase === "complete" ? (
        <p className="rounded border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-center font-mono text-xs text-emerald-300/90">
          Pipeline completo — {validadas.length} partículas persistidas en{" "}
          <code className="text-emerald-200/80">data/molecular/</code>
        </p>
      ) : null}
    </section>
  );
}
