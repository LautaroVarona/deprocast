"use client";

import { buildRendimientoMetrics } from "@/components/salud/lib/metrics";
import { resolveOccurredAt } from "@/components/salud/lib/timestamp";
import { ActivityHistoryCompact } from "@/components/salud/shared/activity-history-compact";
import { MetricTypeSelect } from "@/components/salud/shared/metric-type-select";
import { TimestampSelector } from "@/components/salud/shared/timestamp-selector";
import type { ActivityMetricType, TimestampMode } from "@/components/salud/types";
import { recordToActividad } from "@/components/salud/types";
import { Button } from "@/components/ui/button";
import type { HealthRecordDto } from "@/lib/events/types";
import { Loader2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type DeportePanelProps = {
  records: HealthRecordDto[];
  isLoading: boolean;
  onSaved: (record?: HealthRecordDto) => void;
};

const METRIC_PLACEHOLDERS: Record<ActivityMetricType, string> = {
  duration_min: "45",
  distance_km: "5.2",
  intensity: "7",
};

const METRIC_LABELS: Record<ActivityMetricType, string> = {
  duration_min: "Minutos",
  distance_km: "Kilómetros",
  intensity: "Intensidad",
};

export function DeportePanel({
  records,
  isLoading,
  onSaved,
}: DeportePanelProps) {
  const [descripcion, setDescripcion] = useState("");
  const [metricType, setMetricType] =
    useState<ActivityMetricType>("duration_min");
  const [metricValue, setMetricValue] = useState("");
  const [timestampMode, setTimestampMode] = useState<TimestampMode>("now");
  const [specificTime, setSpecificTime] = useState("12:00");
  const [isSaving, setIsSaving] = useState(false);

  const historyItems = useMemo(
    () =>
      records
        .map(recordToActividad)
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [records],
  );

  const resetForm = () => {
    setDescripcion("");
    setMetricType("duration_min");
    setMetricValue("");
    setTimestampMode("now");
    setSpecificTime("12:00");
  };

  const handleSubmit = async () => {
    const trimmed = descripcion.trim();
    const parsedValue = Number(metricValue);
    if (!trimmed || !metricValue || Number.isNaN(parsedValue) || isSaving) return;

    if (metricType === "intensity" && (parsedValue < 1 || parsedValue > 10)) {
      toast.error("La intensidad debe estar entre 1 y 10");
      return;
    }

    setIsSaving(true);
    try {
      const occurredAt = resolveOccurredAt(timestampMode, specificTime);
      const response = await fetch("/api/salud/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pillar: "rendimiento",
          summary: trimmed,
          occurredAt: occurredAt.toISOString(),
          metrics: buildRendimientoMetrics({
            metricType,
            metricValue: parsedValue,
          }),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo registrar la actividad");
      }

      resetForm();
      onSaved(data.record as HealthRecordDto);
      toast.success("Actividad registrada");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo registrar la actividad";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-3">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_180px]">
        <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,1fr)_140px]">
            <textarea
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              placeholder="¿Qué hiciste?"
              className="min-h-0 flex-1 resize-none rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5 text-sm leading-snug text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-700/80"
            />
            <div className="flex shrink-0 flex-col gap-2">
              <MetricTypeSelect value={metricType} onChange={setMetricType} />
              <input
                type="number"
                min={metricType === "intensity" ? 1 : 0}
                max={metricType === "intensity" ? 10 : undefined}
                step={metricType === "distance_km" ? 0.1 : 1}
                value={metricValue}
                onChange={(event) => setMetricValue(event.target.value)}
                placeholder={METRIC_PLACEHOLDERS[metricType]}
                aria-label={METRIC_LABELS[metricType]}
                className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-2 font-mono text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              />
            </div>
          </div>

          <TimestampSelector
            mode={timestampMode}
            specificTime={specificTime}
            onModeChange={setTimestampMode}
            onSpecificTimeChange={setSpecificTime}
          />

          <Button
            size="sm"
            className="shrink-0 self-start"
            disabled={
              !descripcion.trim() || !metricValue.trim() || isSaving
            }
            onClick={() => void handleSubmit()}
          >
            {isSaving ? <Loader2Icon className="animate-spin" /> : null}
            Registrar Actividad
          </Button>
        </div>

        <ActivityHistoryCompact items={historyItems} isLoading={isLoading} />
      </div>
    </div>
  );
}
