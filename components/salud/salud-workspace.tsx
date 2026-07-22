"use client";

import {
  buildSaludIngestFormData,
  confirmSaludDraft,
  postSaludIngestDraft,
} from "@/components/salud/lib/ingest-client";
import { HealthDraftCard } from "@/components/salud/shared/health-draft-card";
import {
  HealthQuickTable,
  type FoodRow,
  type TrainingRow,
} from "@/components/salud/shared/health-quick-table";
import type { HealthDraft, HealthIngestModality } from "@/lib/health/health-broker-types";
import { CameraIcon, MicIcon, PlusIcon, SparklesIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function emptyFoodRow(): FoodRow {
  return {
    name: "",
    quantity: "",
    grams: undefined,
    calories: undefined,
    protein: undefined,
    carbs: undefined,
    fat: undefined,
  };
}

function emptyTrainingRow(): TrainingRow {
  return {
    exercise: "",
    series: undefined,
    reps: undefined,
    weightKg: undefined,
  };
}

function buildManualDraft(input: {
  activeTab: "alimentacion" | "entrenamiento";
  text: string;
  ingestMode: "libre" | "tabla";
  foodRows: FoodRow[];
  trainingRows: TrainingRow[];
}): HealthDraft | null {
  if (input.activeTab === "alimentacion") {
    const items =
      input.ingestMode === "tabla"
        ? input.foodRows
            .filter((row) => row.name.trim())
            .map((row) => ({
              name: row.name.trim(),
              quantity: row.quantity?.trim() || undefined,
              grams: row.grams,
              calories: row.calories,
              protein: row.protein,
              carbs: row.carbs,
              fat: row.fat,
            }))
        : input.text.trim()
          ? [{ name: input.text.trim() }]
          : [];

    if (!items.length) return null;

    const totals = items.reduce(
      (acc, item) => ({
        calories: acc.calories + (item.calories ?? 0),
        protein: acc.protein + (item.protein ?? 0),
        carbs: acc.carbs + (item.carbs ?? 0),
        fat: acc.fat + (item.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    const hasMacros =
      totals.calories > 0 || totals.protein > 0 || totals.carbs > 0 || totals.fat > 0;

    return {
      domain: "alimentacion",
      summary: items.map((item) => item.name).slice(0, 4).join(", "),
      confidence: 1,
      nutrition: {
        items,
        totals: hasMacros ? totals : undefined,
      },
    };
  }

  const sets =
    input.ingestMode === "tabla"
      ? input.trainingRows
          .filter((row) => row.exercise.trim())
          .map((row) => ({
            exercise: row.exercise.trim(),
            series: row.series,
            reps: row.reps,
            weightKg: row.weightKg,
          }))
      : input.text.trim()
        ? [{ exercise: input.text.trim() }]
        : [];

  if (!sets.length) return null;

  return {
    domain: "entrenamiento",
    summary: sets.map((set) => set.exercise).slice(0, 4).join(", "),
    confidence: 1,
    training: {
      intensity: "media",
      sets,
    },
  };
}

export function SaludWorkspace() {
  const [activeTab, setActiveTab] = useState<"alimentacion" | "entrenamiento">(
    "alimentacion",
  );
  const [text, setText] = useState("");
  const [ingestMode, setIngestMode] = useState<"libre" | "tabla">("libre");
  const [foodRows, setFoodRows] = useState<FoodRow[]>([emptyFoodRow()]);
  const [trainingRows, setTrainingRows] = useState<TrainingRow[]>([emptyTrainingRow()]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
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
      sets: Array<{
        id: string;
        exercise: string;
        series: number | null;
        reps: number | null;
        weightKg: number | null;
      }>;
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
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudieron cargar los registros");
      }
      setData(payload);
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

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const tableText = useMemo(() => {
    if (activeTab === "alimentacion") {
      return foodRows
        .filter((row) => row.name.trim())
        .map(
          (row) =>
            `${row.name} ${row.quantity ?? ""} ${row.grams ? `${row.grams}g` : ""}`.trim(),
        )
        .join("\n");
    }
    return trainingRows
      .filter((row) => row.exercise.trim())
      .map(
        (row) =>
          `${row.exercise} ${row.series ?? "-"}x${row.reps ?? "-"} ${row.weightKg ?? "-"}kg`,
      )
      .join("\n");
  }, [activeTab, foodRows, trainingRows]);

  const hasManualInput =
    text.trim().length > 0 ||
    tableText.length > 0 ||
    Boolean(imageFile) ||
    Boolean(audioFile);

  const canSaveDirect =
    !isSaving &&
    !imageFile &&
    !audioFile &&
    (text.trim().length > 0 || tableText.length > 0);

  const canEnrichAi = !isSaving && hasManualInput;

  const resetInputs = useCallback(() => {
    setText("");
    setFoodRows([emptyFoodRow()]);
    setTrainingRows([emptyTrainingRow()]);
    setImageFile(null);
    setAudioFile(null);
  }, []);

  const saveDirect = async () => {
    if (!canSaveDirect) return;
    const draft = buildManualDraft({
      activeTab,
      text,
      ingestMode,
      foodRows,
      trainingRows,
    });
    if (!draft) {
      toast.error("Agregá al menos un ítem para guardar");
      return;
    }

    setIsSaving(true);
    try {
      const sourceChannel: HealthIngestModality =
        ingestMode === "tabla" ? "table" : "text";
      const sourceRaw = ingestMode === "tabla" ? tableText : text.trim();
      await confirmSaludDraft({
        draft,
        sourceRaw,
        sourceChannel,
        occurredAt: new Date().toISOString(),
      });
      setDraftState(null);
      resetInputs();
      toast.success(
        activeTab === "alimentacion" ? "Comida registrada" : "Entrenamiento registrado",
      );
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const enrichWithAi = async () => {
    if (!canEnrichAi) return;
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
      toast.message("Estimación lista — revisá y aprobá el borrador");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo analizar la entrada",
      );
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
      resetInputs();
      toast.success("Registro confirmado");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo confirmar");
    } finally {
      setIsSaving(false);
    }
  }, [draftState, refresh, resetInputs]);

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

          {imagePreviewUrl ? (
            <div className="relative overflow-hidden rounded-md border border-border bg-background/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Vista previa"
                className="max-h-[250px] w-full object-contain"
              />
              <button
                type="button"
                aria-label="Quitar imagen"
                onClick={() => setImageFile(null)}
                className="absolute right-1.5 top-1.5 rounded-md border border-border bg-background/90 p-1 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          ) : null}

          {audioFile ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-2 py-1.5 text-xs text-muted-foreground">
              <span className="truncate">{audioFile.name}</span>
              <button
                type="button"
                aria-label="Quitar audio"
                onClick={() => setAudioFile(null)}
                className="rounded p-0.5 hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          ) : null}

          {ingestMode === "libre" ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                activeTab === "alimentacion"
                  ? "Comí 250g de pechuga, 100g arroz..."
                  : "Hice 4 series de press banca con 80kg..."
              }
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

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => void saveDirect()}
              disabled={!canSaveDirect}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              <PlusIcon className="size-3.5" />
              {ingestMode === "tabla" ? "Guardar todo" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => void enrichWithAi()}
              disabled={!canEnrichAi}
              className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 disabled:opacity-40 dark:text-amber-300"
            >
              <SparklesIcon className="size-3.5" />
              {activeTab === "alimentacion"
                ? "Estimar nutrientes con IA"
                : "Procesar con IA"}
            </button>
          </div>

          {draftState ? (
            <HealthDraftCard
              draft={draftState.draft}
              isSaving={isSaving}
              onApprove={() => void confirmDraft()}
              onDiscard={() => setDraftState(null)}
            />
          ) : null}
        </section>

        <section className="grid min-h-0 grid-rows-[auto_1fr] gap-2 overflow-hidden">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-2 text-xs text-foreground/80">
            <div>
              <p className="font-mono uppercase tracking-wide text-muted-foreground">
                Alimentación hoy
              </p>
              <p>{Math.round(data?.nutritionTotals.calories ?? 0)} kcal</p>
              <p>
                P {Math.round(data?.nutritionTotals.protein ?? 0)} / C{" "}
                {Math.round(data?.nutritionTotals.carbs ?? 0)} / G{" "}
                {Math.round(data?.nutritionTotals.fat ?? 0)}
              </p>
            </div>
            <div>
              <p className="font-mono uppercase tracking-wide text-muted-foreground">
                Entrenamiento hoy
              </p>
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
                  <div
                    key={entry.id}
                    className="rounded-lg border border-border px-2 py-1.5 text-xs text-foreground"
                  >
                    <p>{entry.summary}</p>
                    <p className="text-muted-foreground">
                      {new Date(entry.occurredAt).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {entry.totals.calories
                        ? ` · ${Math.round(entry.totals.calories)} kcal`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {data?.trainingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-lg border border-border px-2 py-1.5 text-xs text-foreground"
                  >
                    <p>{session.summary}</p>
                    <p className="text-muted-foreground">
                      {session.durationMin ?? 0} min ·{" "}
                      {Math.round(session.totalVolumeKg ?? 0)} kg
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
