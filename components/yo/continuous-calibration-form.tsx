"use client";

import {
  CALIBRATION_PROMPTS,
  type CalibrationMap,
} from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

type ContinuousCalibrationFormProps = {
  calibration: CalibrationMap;
  onSubmitAnswer: (promptId: string, answer: string) => Promise<void>;
  disabled?: boolean;
};

export function ContinuousCalibrationForm({
  calibration,
  onSubmitAnswer,
  disabled = false,
}: ContinuousCalibrationFormProps) {
  const unanswered = useMemo(
    () => CALIBRATION_PROMPTS.filter((prompt) => !calibration[prompt.id]),
    [calibration],
  );

  const [cycleIndex, setCycleIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState(false);

  const activePrompt =
    unanswered.length > 0
      ? unanswered[cycleIndex % unanswered.length]
      : CALIBRATION_PROMPTS[cycleIndex % CALIBRATION_PROMPTS.length];

  const answeredCount = CALIBRATION_PROMPTS.filter(
    (prompt) => Boolean(calibration[prompt.id]),
  ).length;

  const handleSubmit = async () => {
    const trimmed = answer.trim();
    if (!trimmed || !activePrompt || submitting || disabled) return;

    setSubmitting(true);
    try {
      await onSubmitAnswer(activePrompt.id, trimmed);
      setAnswer("");
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1600);
      setCycleIndex((prev) => prev + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="yo-noir-panel space-y-5 p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.28em] text-accent uppercase">
            Calibración continua
          </p>
          <h2 className="mt-2 font-mono text-xl text-accent">
            Alimentar soporte vital
          </h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Una pregunta a la vez. Cada respuesta refuerza la base del
            Observador.
          </p>
        </div>
        <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          {answeredCount}/{CALIBRATION_PROMPTS.length} señales
        </span>
      </div>

      <div className="border border-accent/20 bg-card/80 p-4 md:p-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-accent uppercase">
          Consulta del sistema
        </p>
        <p className="mt-3 font-mono text-lg leading-snug text-accent md:text-xl">
          {activePrompt?.question}
        </p>

        {calibration[activePrompt?.id ?? ""] ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Señal previa: {calibration[activePrompt.id]}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            disabled={disabled || submitting}
            placeholder="Respuesta para el exoesqueleto…"
            className="min-h-11 flex-1 border border-accent/25 bg-transparent px-3 font-mono text-sm text-accent placeholder:text-muted-foreground outline-none focus:border-accent/55 disabled:opacity-50"
          />
          <button
            type="button"
            disabled={disabled || submitting || !answer.trim()}
            onClick={() => void handleSubmit()}
            className={cn(
              "min-h-11 border border-accent bg-accent/15 px-4 font-mono text-[11px] tracking-[0.18em] text-accent uppercase transition-colors",
              "hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            {submitting ? "[ INYECTANDO… ]" : "[ CONFIRMAR ]"}
          </button>
        </div>

        {flash ? (
          <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-chart-3 uppercase">
            [ SEÑAL ABSORBIDA ]
          </p>
        ) : null}
      </div>

      {answeredCount > 0 ? (
        <ul className="space-y-2 border-t border-accent/15 pt-4">
          {CALIBRATION_PROMPTS.filter((prompt) => calibration[prompt.id]).map(
            (prompt) => (
              <li
                key={prompt.id}
                className="font-mono text-[11px] text-muted-foreground"
              >
                <span className="text-accent">{prompt.question}</span>
                <span className="mt-0.5 block text-muted-foreground">
                  → {calibration[prompt.id]}
                </span>
              </li>
            ),
          )}
        </ul>
      ) : null}
    </section>
  );
}
