"use client";

import { useCalibrator } from "./calibrator-context";
import type { CalibratorCardSource } from "./types";
import { Button } from "@/components/ui/button";
import {
  CALIBRATOR_CARD_SOURCES,
  MAX_QUEUE_LIMIT,
  MIN_QUEUE_LIMIT,
} from "@/lib/vibe-calibrator/constants";
import {
  getDefaultCampo,
  type CampoInfo,
} from "@/lib/projects/campos";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const SOURCE_LABELS: Record<CalibratorCardSource, string> = {
  validated: "Validadas",
  generated: "Generadas",
};

export function CalibratorConfigPanel() {
  const { state, dispatch, startSession } = useCalibrator();
  const [campos, setCampos] = useState<CampoInfo[]>([getDefaultCampo()]);
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/proyectos", { cache: "no-store" });
        if (!response.ok) return;
        const data: { campos?: CampoInfo[] } = await response.json();
        if (data.campos?.length) setCampos(data.campos);
      } catch {
        // default local
      }
    })();
  }, []);

  const loadPreview = useCallback(async () => {
    setIsLoadingPreview(true);
    try {
      const params = new URLSearchParams({
        sources: state.config.sources.join(","),
        limit: String(state.config.limit),
      });
      if (state.config.campoSlug) {
        params.set("campoSlug", state.config.campoSlug);
      }

      const response = await fetch(
        `/api/vibe-calibrator/queue?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPreviewTotal(0);
        return;
      }

      setPreviewTotal(typeof data.total === "number" ? data.total : 0);
    } catch {
      setPreviewTotal(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [state.config]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPreview();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [loadPreview]);

  const toggleSource = (source: CalibratorCardSource) => {
    const hasSource = state.config.sources.includes(source);
    const next = hasSource
      ? state.config.sources.filter((item) => item !== source)
      : [...state.config.sources, source];

    dispatch({
      type: "SET_CONFIG",
      payload: {
        sources: next.length > 0 ? next : [source],
      },
    });
  };

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await startSession();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar la sesión.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  const canStart = (previewTotal ?? 0) > 0 && !isStarting;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <header className="space-y-1 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Vibe Calibrator
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Calibrador de gravedad
        </h1>
        <p className="text-sm text-muted-foreground">
          Configura la cola y calibra pesos del 1 al 12 con fricción cero.
        </p>
      </header>

      <div className="space-y-6 rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground">
            Fuentes de cards
          </legend>
          <div className="flex flex-wrap gap-2">
            {CALIBRATOR_CARD_SOURCES.map((source) => {
              const active = state.config.sources.includes(source);
              return (
                <button
                  key={source}
                  type="button"
                  onClick={() => toggleSource(source)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/20",
                  )}
                >
                  {SOURCE_LABELS[source]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <label
            htmlFor="calibrator-campo"
            className="text-sm font-medium text-foreground"
          >
            Campo
          </label>
          <select
            id="calibrator-campo"
            value={state.config.campoSlug ?? ""}
            onChange={(event) =>
              dispatch({
                type: "SET_CONFIG",
                payload: {
                  campoSlug: event.target.value || undefined,
                },
              })
            }
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Todos los campos</option>
            {campos.map((campo) => (
              <option key={campo.slug} value={campo.slug}>
                {campo.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="calibrator-limit"
            className="text-sm font-medium text-foreground"
          >
            Límite de cards
          </label>
          <input
            id="calibrator-limit"
            type="number"
            min={MIN_QUEUE_LIMIT}
            max={MAX_QUEUE_LIMIT}
            value={state.config.limit}
            onChange={(event) =>
              dispatch({
                type: "SET_CONFIG",
                payload: {
                  limit: Number(event.target.value) || MIN_QUEUE_LIMIT,
                },
              })
            }
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2">
          <span className="text-sm text-muted-foreground">Cola estimada</span>
          <span className="font-mono text-sm tabular-nums text-foreground">
            {isLoadingPreview ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : previewTotal === null ? (
              "—"
            ) : (
              previewTotal
            )}
          </span>
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!canStart}
          onClick={() => void handleStart()}
        >
          {isStarting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Iniciando…
            </>
          ) : (
            "Iniciar"
          )}
        </Button>
      </div>
    </div>
  );
}
