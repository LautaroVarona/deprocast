"use client";

import { Button } from "@/components/ui/button";
import {
  FormField,
  inputClassName,
} from "@/components/proyectos/form-controls";
import type { HealthPillar } from "@/lib/events/types";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type HealthRecordFormProps = {
  pillar: HealthPillar;
  onSaved: () => void;
};

export function HealthRecordForm({ pillar, onSaved }: HealthRecordFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [summary, setSummary] = useState("");
  const [blockType, setBlockType] = useState("");
  const [zone, setZone] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [intensity, setIntensity] = useState<"baja" | "media" | "alta">("media");
  const [combustibleKind, setCombustibleKind] = useState<
    "ayuno" | "agua" | "suplemento" | "desviacion" | "comida"
  >("agua");
  const [combustibleValue, setCombustibleValue] = useState("");
  const [combustibleUnit, setCombustibleUnit] = useState("ml");
  const [sleepHours, setSleepHours] = useState("");
  const [sleepQuality, setSleepQuality] = useState("5");
  const [period, setPeriod] = useState<"am" | "pm">("am");
  const [energy, setEnergy] = useState("7");
  const [focus, setFocus] = useState("7");
  const [clarity, setClarity] = useState("7");

  const buildMetrics = (): Record<string, unknown> => {
    switch (pillar) {
      case "rendimiento":
        return {
          blockType: blockType.trim() || undefined,
          zone: zone.trim() || undefined,
          durationMin: durationMin ? Number(durationMin) : undefined,
          intensity,
        };
      case "combustible":
        return {
          kind: combustibleKind,
          value: combustibleValue || undefined,
          unit: combustibleUnit || undefined,
        };
      case "recuperacion":
        return {
          sleepHours: sleepHours ? Number(sleepHours) : undefined,
          quality: Number(sleepQuality),
        };
      case "estado_base":
        return {
          period,
          energy: Number(energy),
          focus: Number(focus),
          clarity: Number(clarity),
        };
      default:
        return {};
    }
  };

  const handleSubmit = async () => {
    const trimmedSummary = summary.trim();
    if (!trimmedSummary || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/salud/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pillar,
          summary: trimmedSummary,
          metrics: buildMetrics(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar");
      }

      setSummary("");
      onSaved();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 border-b border-border p-4">
      <FormField label="Resumen del registro">
        <input
          className={inputClassName}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Ej: Entrenamiento fuerza - empujes - 45 min"
        />
      </FormField>

      {pillar === "rendimiento" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Tipo de bloque">
            <input
              className={inputClassName}
              value={blockType}
              onChange={(e) => setBlockType(e.target.value)}
              placeholder="Fuerza, cardio..."
            />
          </FormField>
          <FormField label="Zona / grupo">
            <input
              className={inputClassName}
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Empujes, pierna..."
            />
          </FormField>
          <FormField label="Duración (min)">
            <input
              type="number"
              className={inputClassName}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
            />
          </FormField>
          <FormField label="Intensidad">
            <select
              className={inputClassName}
              value={intensity}
              onChange={(e) =>
                setIntensity(e.target.value as "baja" | "media" | "alta")
              }
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </FormField>
        </div>
      )}

      {pillar === "combustible" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Tipo">
            <select
              className={inputClassName}
              value={combustibleKind}
              onChange={(e) =>
                setCombustibleKind(
                  e.target.value as typeof combustibleKind,
                )
              }
            >
              <option value="ayuno">Ayuno</option>
              <option value="agua">Agua</option>
              <option value="suplemento">Suplemento</option>
              <option value="desviacion">Desviación</option>
              <option value="comida">Comida</option>
            </select>
          </FormField>
          <FormField label="Valor">
            <input
              className={inputClassName}
              value={combustibleValue}
              onChange={(e) => setCombustibleValue(e.target.value)}
            />
          </FormField>
          <FormField label="Unidad">
            <input
              className={inputClassName}
              value={combustibleUnit}
              onChange={(e) => setCombustibleUnit(e.target.value)}
            />
          </FormField>
        </div>
      )}

      {pillar === "recuperacion" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Horas de sueño">
            <input
              type="number"
              step="0.5"
              className={inputClassName}
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
            />
          </FormField>
          <FormField label="Calidad (1-10)">
            <input
              type="range"
              min={1}
              max={10}
              value={sleepQuality}
              onChange={(e) => setSleepQuality(e.target.value)}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{sleepQuality}/10</span>
          </FormField>
        </div>
      )}

      {pillar === "estado_base" && (
        <div className="space-y-3">
          <FormField label="Momento">
            <select
              className={inputClassName}
              value={period}
              onChange={(e) => setPeriod(e.target.value as "am" | "pm")}
            >
              <option value="am">Mañana</option>
              <option value="pm">Tarde / cierre</option>
            </select>
          </FormField>
          {(["energy", "focus", "clarity"] as const).map((key, idx) => {
            const labels = ["Energía", "Foco", "Claridad"];
            const values = [energy, focus, clarity];
            const setters = [setEnergy, setFocus, setClarity];
            return (
              <FormField key={key} label={`${labels[idx]} (1-10)`}>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={values[idx]}
                  onChange={(e) => setters[idx](e.target.value)}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">
                  {values[idx]}/10
                </span>
              </FormField>
            );
          })}
        </div>
      )}

      <Button
        disabled={!summary.trim() || isSaving}
        onClick={() => void handleSubmit()}
      >
        {isSaving && <Loader2Icon className="animate-spin" />}
        Registrar en Salud
      </Button>
    </div>
  );
}
