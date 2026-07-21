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
  const [foodRows, setFoodRows] = useState<
    Array<{ name: string; quantity?: string; grams?: number }>
  >([{ name: "", quantity: "", grams: undefined }]);
  const [trainingRows, setTrainingRows] = useState<
    Array<{ exercise: string; series?: number; reps?: number; weightKg?: number }>
  >([
    { exercise: "", series: undefined, reps: undefined, weightKg: undefined },
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
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <h1 className="text-sm font-semibold text-foreground">Salud</h1>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <button
            type="button"
            className={`rounded-md px-2 py-1 text-xs ${activeTab === "alimentacion" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("alimentacion")}
          >
            Alimentación
          </button>
          <button
            type="button"
            className={`rounded-md px-2 py-1 text-xs ${activeTab === "entrenamiento" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("entrenamiento")}
          >
            Entrenamiento
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-2 overflow-auto p-2 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex min-h-0 flex-col gap-2 rounded-xl border border-border bg-muted/40 p-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-lg border border-border p-1">
              <button
                type="button"
                className={`rounded px-2 py-1 text-[11px] ${ingestMode === "libre" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                onClick={() => setIngestMode("libre")}
              >
                Texto
              </button>
              <button
                type="button"
                className={`rounded px-2 py-1 text-[11px] ${ingestMode === "tabla" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                onClick={() => setIngestMode("tabla")}
              >
                Tabla rápida
              </button>
            </div>
            <div className="flex items-center gap-1">
              <label className="cursor-pointer rounded border border-border p-1 text-muted-foreground hover:text-foreground">
                <CameraIcon className="size-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="cursor-pointer rounded border border-border p-1 text-muted-foreground hover:text-foreground">
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
              className="min-h-[110px] resize-none rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none"
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
            className="inline-flex w-fit items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            <PlusIcon className="size-3.5" /> Procesar con health-broker
          </button>
        </section>

        <section className="grid min-h-0 grid-rows-[auto_1fr] gap-2 overflow-hidden">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-2 text-xs text-foreground/80">
            <div>
              <p className="font-mono uppercase tracking-wide text-muted-foreground">Alimentación hoy</p>
              <p>{Math.round(data?.nutritionTotals.calories ?? 0)} kcal</p>
              <p>
                P {Math.round(data?.nutritionTotals.protein ?? 0)} / C {Math.round(data?.nutritionTotals.carbs ?? 0)} / G {Math.round(data?.nutritionTotals.fat ?? 0)}
              </p>
            </div>
            <div>
              <p className="font-mono uppercase tracking-wide text-muted-foreground">Entrenamiento hoy</p>
              <p>{Math.round(data?.trainingTotals.durationMin ?? 0)} min</p>
              <p>{Math.round(data?.trainingTotals.volumeKg ?? 0)} kg volumen</p>
            </div>
          </div>

          <div className="min-h-0 overflow-auto rounded-xl border border-border bg-muted/40 p-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : activeTab === "alimentacion" ? (
              <div className="space-y-2">
                {data?.nutritionEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border px-2 py-1.5 text-xs text-foreground">
                    <p>{entry.summary}</p>
                    <p className="text-muted-foreground">
                      {new Date(entry.occurredAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {data?.trainingSessions.map((session) => (
                  <div key={session.id} className="rounded-lg border border-border px-2 py-1.5 text-xs text-foreground">
                    <p>{session.summary}</p>
                    <p className="text-muted-foreground">
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
        <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-3 py-2">
          <div className="mx-auto w-full max-w-2xl">
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
