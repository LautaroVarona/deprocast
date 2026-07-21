"use client";

import { HermeticScale } from "@/components/pendientes/hermetic-scale";
import type { PendingTaskDto } from "@/lib/pendientes/types";
import { MIN_CALIBRATION_WEIGHT } from "@/lib/pendientes/types";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TaskCalibratorPanelProps = {
  task: PendingTaskDto;
  onCalibrated: (task: PendingTaskDto) => void;
};

export function TaskCalibratorPanel({
  task,
  onCalibrated,
}: TaskCalibratorPanelProps) {
  const [weight, setWeight] = useState(task.weight ?? 6);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCommit = async (nextWeight: number) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/pendientes/${task.id}/calibrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: nextWeight }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Error al calibrar.");
      }
      if (nextWeight < MIN_CALIBRATION_WEIGHT) {
        toast.info(
          `Peso ${nextWeight} — tarea desvalidada (< ${MIN_CALIBRATION_WEIGHT}).`,
        );
      } else {
        toast.success(`Calibrada con peso ${nextWeight}.`);
      }
      onCalibrated(data.task);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo calibrar.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-accent/20 bg-background p-4 shadow-[inset_0_1px_0_rgba(251,191,36,0.06)]">
      <div>
        <p className="font-mono text-[10px] tracking-wider text-accent uppercase">
          Calibrador de Tareas
        </p>
        <h3 className="text-sm font-medium">{task.title}</h3>
        {task.description ? (
          <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
        ) : null}
      </div>
      <HermeticScale
        value={weight}
        onChange={setWeight}
        onCommit={(value) => void handleCommit(value)}
        disabled={isSubmitting}
      />
      {isSubmitting ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2Icon className="size-3.5 animate-spin" />
          Registrando voto…
        </div>
      ) : (
        <p className="font-mono text-[10px] text-muted-foreground">
          Tocá un bloque para fijar el peso. Voto &lt; {MIN_CALIBRATION_WEIGHT}{" "}
          desvalida la tarea.
        </p>
      )}
    </div>
  );
}
