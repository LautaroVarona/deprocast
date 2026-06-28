"use client";

import { CalibratorPanel } from "@/components/molecular/calibrator-panel";
import {
  MolecularProvider,
  useMolecular,
} from "@/components/molecular/molecular-context";
import { SemanticChunkerPanel } from "@/components/molecular/semantic-chunker-panel";
import type { PipelinePhase } from "@/lib/molecular-processing/types";
import { cn } from "@/lib/utils";
import { HexagonIcon } from "lucide-react";

const PIPELINE_STEPS: {
  id: string;
  label: string;
  phases: PipelinePhase[];
}[] = [
  { id: "chunk", label: "Chunkear", phases: ["chunking", "disintegrating"] },
  { id: "calibrate", label: "Calibrar", phases: ["calibrating"] },
  { id: "validate", label: "Validar", phases: ["validating", "complete"] },
];

function PipelineIndicator() {
  const { phase } = useMolecular();

  const activeIndex = PIPELINE_STEPS.findIndex((step) =>
    step.phases.includes(phase),
  );

  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
      {PIPELINE_STEPS.map((step, index) => {
        const isActive = step.phases.includes(phase);
        const isDone =
          activeIndex > index || phase === "complete";

        return (
          <div key={step.id} className="flex items-center gap-2">
            {index > 0 ? (
              <span
                className={cn(
                  "h-px w-6 transition-colors",
                  isDone ? "bg-emerald-500/50" : "bg-white/10",
                )}
              />
            ) : null}
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 transition-all duration-300",
                isActive
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : isDone
                    ? "border-white/15 text-white/50"
                    : "border-white/8 text-white/25",
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MolecularPanels() {
  return (
    <div className="molecular-noir-root mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HexagonIcon className="size-5 text-emerald-400/70" />
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
                Motor Molecular
              </p>
            </div>
            <h1 className="bg-gradient-to-r from-white via-white/85 to-white/50 bg-clip-text font-mono text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
              Chunkeador → Calibrador → Validación
            </h1>
            <p className="max-w-2xl text-sm text-white/45">
              Pipeline en cadena: desintegración semántica, calibración de ejes
              X/Y/Z y validación humana con Currency Potencial.
            </p>
          </div>
          <PipelineIndicator />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <SemanticChunkerPanel />
        <CalibratorPanel />
      </div>

      <footer className="font-mono text-[10px] text-white/20">
        Fórmula: Currency Potencial = Eje Y (Valor) ÷ Eje Z (Fricción) · Eje X
        mapea 6 bloques de prioridad
      </footer>
    </div>
  );
}

export function MolecularWorkspace() {
  return (
    <MolecularProvider>
      <MolecularPanels />
    </MolecularProvider>
  );
}
