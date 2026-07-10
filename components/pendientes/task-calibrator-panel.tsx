"use client";

import { WeightSlider } from "@/components/vibe-calibrator/weight-slider";
import { Button } from "@/components/ui/button";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRelease = async (weight: number) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/pendientes/${task.id}/calibrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Error al calibrar.");
      }
      if (weight < MIN_CALIBRATION_WEIGHT) {
        toast.info(`Peso ${weight} — tarea desvalidada (< ${MIN_CALIBRATION_WEIGHT}).`);
      } else {
        toast.success(`Calibrada con peso ${weight}.`);
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
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Calibrador de Tareas
        </p>
        <h3 className="text-sm font-medium">{task.title}</h3>
        {task.description ? (
          <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
        ) : null}
      </div>
      <WeightSlider
        defaultValue={task.weight ?? 6}
        onRelease={(value) => void handleRelease(value)}
        disabled={isSubmitting}
      />
      {isSubmitting ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2Icon className="size-3.5 animate-spin" />
          Registrando voto…
        </div>
      ) : (
        <p className="font-mono text-[10px] text-muted-foreground">
          Voto &lt; {MIN_CALIBRATION_WEIGHT} desvalida la tarea automáticamente.
        </p>
      )}
    </div>
  );
}
