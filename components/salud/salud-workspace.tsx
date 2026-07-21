"use client";

import {
  buildSaludIngestFormData,
  confirmSaludDraft,
  postSaludIngestDraft,
} from "@/components/salud/lib/ingest-client";
import { HealthDraftCard } from "@/components/salud/shared/health-draft-card";
import { HealthQuickTable } from "@/components/salud/shared/health-quick-table";
import type { HealthDraft, HealthIngestModality } from "@/lib/health/health-broker-types";
import { CameraIcon, MicIcon, PlusIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function SaludWorkspace() {
  const [activeTab, setActiveTab] = useState<"alimentacion" | "entrenamiento">(
    "alimentacion",
  );
  const [text, setText] = useState("");
  const [ingestMode, setIngestMode] = useState<"libre" | "tabla">("libre");
  const [foodRows, setFoodRows] = useState([{ name: "", quantity: "", grams: undefined as number | undefined }]);
  const [trainingRows, setTrainingRows] = useState([
    { exercise: "", series: undefined as number | undefined, reps: undefined as number | undefined, weightKg: undefined as number | undefined },
  ]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [draftState, setDraftState] = useState<{
    draft: HealthDraft;
    sourceRaw: string;
    sourceChannel: HealthIngestModality;
    occurredAt: string;
  } | null>(null);
  const [data, setData] = useState<{
    nutritionEntries: Array<{
      id: string;
      summary: string;
      occurredAt: string;
      totals: { calories?: number; protein?: number; carbs?: number; fat?: number };
      items: Array<{ id: string; name: string; quantity: string | null }>;
    }>;
    trainingSessions: Array<{
      id: string;
      summary: string;
      occurredAt: string;
      durationMin: number | null;
      totalVolumeKg: number | null;
      sets: Array<{ id: string; exercise: string; series: number | null; reps: number | null; weightKg: number | null }>;
    }>;
    nutritionTotals: { calories: number; protein: number; carbs: number; fat: number };
    trainingTotals: { durationMin: number; volumeKg: number };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/salud/records?view=today", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar los registros");
      }
      setData(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los registros";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const tableText = useMemo(() => {
    if (activeTab === "alimentacion") {
      return foodRows
        .filter((row) => row.name.trim())
        .map((row) => `${row.name} ${row.quantity ?? ""} ${row.grams ? `${row.grams}g` : ""}`)
        .join("\n");
    }
    return trainingRows
      .filter((row) => row.exercise.trim())
      .map((row) => `${row.exercise} ${row.series ?? "-"}x${row.reps ?? "-"} ${row.weightKg ?? "-"}kg`)
      .join("\n");
  }, [activeTab, foodRows, trainingRows]);

  const canSubmit = !isSaving && (text.trim().length > 0 || tableText.length > 0 || imageFile || audioFile);

  const submitDraft = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      const modality: HealthIngestModality = audioFile
        ? "audio"
        : imageFile
          ? "image"
          : ingestMode === "tabla"
            ? "table"
            : "text";
      const payloadText = ingestMode === "tabla" ? tableText : text;
      const formData = buildSaludIngestFormData({
        modality,
        text: payloadText,
        occurredAt: new Date(),
        file: audioFile ?? imageFile ?? undefined,
      });
      const draft = await postSaludIngestDraft(formData);
      setDraftState(draft);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo analizar la entrada");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDraft = useCallback(async () => {
    if (!draftState) return;
    setIsSaving(true);
    try {
      await confirmSaludDraft(draftState);
      setDraftState(null);
      setText("");
      setImageFile(null);
      setAudioFile(null);
      toast.success("Registro confirmado");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo confirmar");
    } finally {
      setIsSaving(false);
    }
  }, [draftState, refresh]);

  useEffect(() => {
    if (!draftState) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") {
        event.preventDefault();
        void confirmDraft();
      }
      if (event.key === "Escape") {
        setDraftState(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmDraft, draftState]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-3 py-2">
        <h1 className="text-sm font-semibold text-zinc-100">Salud</h1>
        <div className="flex gap-1 rounded-lg border border-zinc-800 p-1">
          <button
            type="button"
            className={`rounded-md px-2 py-1 text-xs ${activeTab === "alimentacion" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400"}`}
            onClick={() => setActiveTab("alimentacion")}
          >
            Alimentación
          </button>
          <button
            type="button"
            className={`rounded-md px-2 py-1 text-xs ${activeTab === "entrenamiento" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400"}`}
            onClick={() => setActiveTab("entrenamiento")}
          >
            Entrenamiento
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-2 overflow-hidden p-2 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex min-h-0 flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-lg border border-zinc-800 p-1">
              <button
                type="button"
                className={`rounded px-2 py-1 text-[11px] ${ingestMode === "libre" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500"}`}
                onClick={() => setIngestMode("libre")}
              >
                Texto
              </button>
              <button
                type="button"
                className={`rounded px-2 py-1 text-[11px] ${ingestMode === "tabla" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500"}`}
                onClick={() => setIngestMode("tabla")}
              >
                Tabla rápida
              </button>
            </div>
            <div className="flex items-center gap-1">
              <label className="cursor-pointer rounded border border-zinc-800 p-1 text-zinc-400 hover:text-zinc-200">
                <CameraIcon className="size-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="cursor-pointer rounded border border-zinc-800 p-1 text-zinc-400 hover:text-zinc-200">
                <MicIcon className="size-4" />
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          {ingestMode === "libre" ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={activeTab === "alimentacion" ? "Comí 250g de pechuga, 100g arroz..." : "Hice 4 series de press banca con 80kg..."}
              className="min-h-[110px] resize-none rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none"
            />
          ) : (
            <HealthQuickTable
              mode={activeTab}
              foodRows={foodRows}
              trainingRows={trainingRows}
              onFoodRowsChange={setFoodRows}
              onTrainingRowsChange={setTrainingRows}
            />
          )}

          <button
            type="button"
            onClick={() => void submitDraft()}
            disabled={!canSubmit}
            className="inline-flex w-fit items-center gap-1 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 disabled:opacity-40"
          >
            <PlusIcon className="size-3.5" /> Procesar con health-broker
          </button>
        </section>

        <section className="grid min-h-0 grid-rows-[auto_1fr] gap-2 overflow-hidden">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-2 text-xs text-zinc-300">
            <div>
              <p className="font-mono uppercase tracking-wide text-zinc-500">Alimentación hoy</p>
              <p>{Math.round(data?.nutritionTotals.calories ?? 0)} kcal</p>
              <p>
                P {Math.round(data?.nutritionTotals.protein ?? 0)} / C {Math.round(data?.nutritionTotals.carbs ?? 0)} / G {Math.round(data?.nutritionTotals.fat ?? 0)}
              </p>
            </div>
            <div>
              <p className="font-mono uppercase tracking-wide text-zinc-500">Entrenamiento hoy</p>
              <p>{Math.round(data?.trainingTotals.durationMin ?? 0)} min</p>
              <p>{Math.round(data?.trainingTotals.volumeKg ?? 0)} kg volumen</p>
            </div>
          </div>

          <div className="min-h-0 overflow-auto rounded-xl border border-zinc-800 bg-zinc-900/40 p-2">
            {isLoading ? (
              <p className="text-sm text-zinc-500">Cargando...</p>
            ) : activeTab === "alimentacion" ? (
              <div className="space-y-2">
                {data?.nutritionEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-zinc-800 px-2 py-1.5 text-xs text-zinc-200">
                    <p>{entry.summary}</p>
                    <p className="text-zinc-500">
                      {new Date(entry.occurredAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {data?.trainingSessions.map((session) => (
                  <div key={session.id} className="rounded-lg border border-zinc-800 px-2 py-1.5 text-xs text-zinc-200">
                    <p>{session.summary}</p>
                    <p className="text-zinc-500">
                      {session.durationMin ?? 0} min · {Math.round(session.totalVolumeKg ?? 0)} kg
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {draftState ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
          <div className="pointer-events-auto w-full max-w-2xl">
            <HealthDraftCard
              draft={draftState.draft}
              isSaving={isSaving}
              onApprove={() => void confirmDraft()}
              onDiscard={() => setDraftState(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
