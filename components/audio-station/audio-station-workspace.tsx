"use client";

import {
  AudioStationProvider,
  useAudioStation,
} from "@/components/audio-station/audio-station-context";
import { MetabolismView } from "@/components/audio-station/MetabolismView";
import { resolveAudioPipelineStage } from "@/lib/audio-station/pipeline-status";
import { cn } from "@/lib/utils";
import { AudioLinesIcon, ArrowRightIcon, WavesIcon } from "lucide-react";
import Link from "next/link";

type FlowChip = {
  id: string;
  label: string;
  tone: string;
  count: number;
};

function AudioStationShell() {
  const { error, scan, assets, queueStatus, reviewByAssetId } =
    useAudioStation();

  const queuedIds = new Set(queueStatus?.queuedIds ?? []);
  const purifyingIds = new Set(queueStatus?.purifyingIds ?? []);
  const activeId = queueStatus?.active?.id ?? null;

  const resolveStage = (asset: (typeof assets)[number]) =>
    resolveAudioPipelineStage(asset, {
      queuedIds,
      activeId,
      purifyingIds,
      reviewByAssetId,
    });

  const inValidationCount = assets.filter(
    (asset) => resolveStage(asset).stage === "in_validation",
  ).length;

  const dedupBadge =
    scan && scan.groups.length > 0 ? scan.duplicateCount : null;

  const flowChips: FlowChip[] = [
    {
      id: "transcription",
      label: "Transcripción",
      tone: "border-primary/35 bg-primary/10 text-primary",
      count: assets.filter((asset) => {
        const stage = resolveStage(asset).stage;
        return (
          stage === "pending_stt" ||
          stage === "stt_queued" ||
          stage === "stt_processing" ||
          stage === "stt_error"
        );
      }).length,
    },
    {
      id: "purification",
      label: "Purificación",
      tone: "border-primary/35 bg-primary/10 text-primary",
      count: assets.filter((asset) => {
        const stage = resolveStage(asset).stage;
        return stage === "purifying" || stage === "pending_purify";
      }).length,
    },
    {
      id: "validation",
      label: "Validación (HITL)",
      tone: "border-primary/35 bg-primary/10 text-primary",
      count: inValidationCount,
    },
  ];

  return (
    <div className="audio-noir-root mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AudioLinesIcon className="size-5 text-primary/70" />
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Motor de metabolización activa
              </p>
            </div>
            <h1 className="bg-gradient-to-r from-foreground via-foreground/85 to-foreground/50 bg-clip-text font-mono text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
              Audio → Conocimiento → Acción
            </h1>
            <p className="max-w-2xl font-mono text-[11px] leading-relaxed text-muted-foreground">
              Un tablero donde cada audio se metaboliza solo: transcripción,
              purificación, chunks, grafo y action items al calendario.
            </p>
          </div>

          <Link
            href="/ingesta"
            className="font-mono text-[10px] text-primary/80 underline-offset-2 hover:underline"
          >
            Ingesta con metadatos →
          </Link>
        </div>

        {error ? (
          <p className="rounded border border-destructive/25 bg-destructive/10 px-3 py-2 font-mono text-[10px] text-destructive/90">
            {error}
          </p>
        ) : null}

        {dedupBadge ? (
          <p className="rounded border border-accent/25 bg-accent/8 px-3 py-2 font-mono text-[10px] text-accent/90">
            {dedupBadge} posible{dedupBadge === 1 ? "" : "s"} duplicado
            {dedupBadge === 1 ? "" : "s"} detectado{dedupBadge === 1 ? "" : "s"}.
            Usá el botón Duplicados en el feed.
          </p>
        ) : null}

        <div className="rounded border border-border bg-card/80 px-3 py-3">
          <div className="mb-2 flex items-center gap-2">
            <WavesIcon className="size-3.5 text-primary/80" />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Flujo operacional
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {flowChips.map((chip, index) => (
              <div key={chip.id} className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px]",
                    chip.tone,
                  )}
                >
                  <span className="font-semibold">{chip.count}</span>
                  <span>{chip.label}</span>
                </span>
                {index < flowChips.length - 1 ? (
                  <ArrowRightIcon className="size-3 text-muted-foreground" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </header>

      <MetabolismView />
    </div>
  );
}

export function AudioStationWorkspace() {
  return (
    <AudioStationProvider>
      <AudioStationShell />
    </AudioStationProvider>
  );
}
