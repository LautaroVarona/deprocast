"use client";

import {
  CamRecorderProvider,
  useCamRecorder,
} from "@/components/cam-recorder/cam-recorder-context";
import { ConsciousnessTimeline } from "@/components/cam-recorder/consciousness-timeline";
import { NoirVideoPlayer } from "@/components/cam-recorder/noir-video-player";
import { VideoDropzone } from "@/components/cam-recorder/video-dropzone";
import type { WatcherPhase } from "@/lib/cam-recorder-watcher/types";
import { cn } from "@/lib/utils";
import {
  CircleDotIcon,
  Loader2Icon,
  RadioIcon,
  SendIcon,
  VideoIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const PHASE_LABELS: Record<WatcherPhase, string> = {
  idle: "En espera",
  loaded: "Video cargado",
  analyzing: "Analizando",
  complete: "Análisis completo",
  injecting: "Inyectando",
  injected: "Inyectado",
  error: "Error",
};

function WatcherControls() {
  const {
    phase,
    videoFile,
    videoDurationSeconds,
    notas,
    error,
    injectedAt,
    isBusy,
    runWatcher,
    injectToDeprocast,
  } = useCamRecorder();

  const canAnalyze =
    Boolean(videoFile) &&
    videoDurationSeconds > 0 &&
    !isBusy &&
    (phase === "loaded" || phase === "complete" || phase === "error");

  const canInject =
    notas.length > 0 &&
    !isBusy &&
    (phase === "complete" || phase === "injected");

  const handleInject = async () => {
    try {
      await injectToDeprocast();
      toast.success("Bloque inyectado a Deprocast", {
        description:
          "El Calibrador Molecular y la Jornada pueden auditar la Variable X con estas notas.",
        action: {
          label: "Abrir Molecular",
          onClick: () => {
            window.location.href = "/molecular";
          },
        },
      });
    } catch {
      toast.error("No se pudo inyectar el bloque.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canAnalyze}
          onClick={() => void runWatcher()}
          className={cn(
            "inline-flex items-center gap-2 rounded border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition-all",
            canAnalyze
              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
              : "cursor-not-allowed border-white/8 text-white/25",
          )}
        >
          {phase === "analyzing" ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <RadioIcon className="size-3.5" />
          )}
          {phase === "analyzing" ? "Procesando…" : "Ejecutar Watcher"}
        </button>

        <button
          type="button"
          disabled={!canInject}
          onClick={() => void handleInject()}
          className={cn(
            "inline-flex items-center gap-2 rounded border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition-all",
            canInject
              ? "border-white/20 bg-white/5 text-white/80 hover:border-emerald-500/30 hover:text-emerald-200"
              : "cursor-not-allowed border-white/8 text-white/25",
          )}
        >
          {phase === "injecting" ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <SendIcon className="size-3.5" />
          )}
          [Inyectar a Deprocast]
        </button>

        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
            phase === "analyzing"
              ? "border-emerald-500/30 text-emerald-400/90"
              : phase === "injected"
                ? "border-emerald-500/20 text-emerald-400/70"
                : phase === "error"
                  ? "border-rose-500/30 text-rose-400/80"
                  : "border-white/10 text-white/35",
          )}
        >
          <CircleDotIcon className="size-2.5" />
          {PHASE_LABELS[phase]}
        </span>
      </div>

      {error ? (
        <p className="font-mono text-[10px] text-rose-400/85">{error}</p>
      ) : null}

      {injectedAt ? (
        <p className="font-mono text-[10px] text-emerald-400/70">
          Inyectado {new Date(injectedAt).toLocaleString("es-AR")} · disponible
          para{" "}
          <Link href="/molecular" className="underline hover:text-emerald-300">
            Calibrador Molecular
          </Link>{" "}
          y{" "}
          <Link href="/jornada" className="underline hover:text-emerald-300">
            Jornada
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function CamRecorderPanels() {
  return (
    <div className="cam-recorder-noir-root mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <VideoIcon className="size-5 text-emerald-400/70" />
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
                Agente Cam-Recorder-Watcher
              </p>
            </div>
            <h1 className="bg-gradient-to-r from-white via-white/85 to-white/50 bg-clip-text font-mono text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
              Ingesta de video → Logs de conciencia
            </h1>
            <p className="max-w-2xl font-mono text-[11px] leading-relaxed text-white/40">
              Procesa grabaciones de pantalla en bruto e indexa cronológicamente
              contexto visual para auditoría del día y cálculo de la Variable X.
            </p>
          </div>
        </div>
        <WatcherControls />
      </header>

      <VideoDropzone />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <NoirVideoPlayer />
        <ConsciousnessTimeline />
      </div>
    </div>
  );
}

export function CamRecorderWorkspace() {
  return (
    <CamRecorderProvider>
      <CamRecorderPanels />
    </CamRecorderProvider>
  );
}
