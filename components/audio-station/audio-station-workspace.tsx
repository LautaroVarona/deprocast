"use client";

import { useState } from "react";
import {
  AudioStationProvider,
  useAudioStation,
} from "@/components/audio-station/audio-station-context";
import { AudioLibraryPanel } from "@/components/audio-station/audio-library-panel";
import { DownstreamPanel } from "@/components/audio-station/downstream-panel";
import { PreprocessPanel } from "@/components/audio-station/preprocess-panel";
import { SttQueuePanel } from "@/components/audio-station/stt-queue-panel";
import { cn } from "@/lib/utils";
import { resolveAudioPipelineStage } from "@/lib/audio-station/pipeline-status";
import { AudioLinesIcon, ArrowRightIcon, WavesIcon } from "lucide-react";
import Link from "next/link";

const STATION_TABS = [
  { id: "library", label: "Biblioteca" },
  { id: "preprocess", label: "Pre-proceso" },
  { id: "stt", label: "STT" },
  { id: "downstream", label: "Downstream" },
] as const;

type StationTab = (typeof STATION_TABS)[number]["id"];

type FlowChip = {
  id: string;
  label: string;
  tone: string;
  count: number;
};

function AudioStationShell() {
  const { phase, error, scan, assets, queueStatus, reviewByAssetId } =
    useAudioStation();
  const [activeTab, setActiveTab] = useState<StationTab>("library");

  const queuedIds = new Set(queueStatus?.queuedIds ?? []);
  const activeId = queueStatus?.active?.id ?? null;

  const pendingPurifyCount = assets.filter(
    (asset) =>
      resolveAudioPipelineStage(asset, {
        queuedIds,
        activeId,
        reviewByAssetId,
      }).stage === "pending_purify",
  ).length;

  const inValidationCount = assets.filter(
    (asset) =>
      resolveAudioPipelineStage(asset, {
        queuedIds,
        activeId,
        reviewByAssetId,
      }).stage === "in_validation",
  ).length;

  const dedupBadge =
    scan && scan.groups.length > 0 ? scan.duplicateCount : null;

  const flowChips: FlowChip[] = [
    {
      id: "pending_stt",
      label: "Pendiente STT",
      tone: "border-white/15 bg-white/5 text-white/70",
      count: assets.filter(
        (asset) =>
          resolveAudioPipelineStage(asset, {
            queuedIds,
            activeId,
            reviewByAssetId,
          }).stage === "pending_stt",
      ).length,
    },
    {
      id: "stt_processing",
      label: "STT activo",
      tone: "border-sky-400/35 bg-sky-500/10 text-sky-200",
      count: assets.filter((asset) => {
        const stage = resolveAudioPipelineStage(asset, {
          queuedIds,
          activeId,
          reviewByAssetId,
        }).stage;
        return stage === "stt_processing" || stage === "stt_queued";
      }).length,
    },
    {
      id: "pending_purify",
      label: "Esperando purificar",
      tone: "border-violet-400/35 bg-violet-500/10 text-violet-200",
      count: pendingPurifyCount,
    },
    {
      id: "in_validation",
      label: "En validación",
      tone: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
      count: inValidationCount,
    },
  ];

  return (
    <div className="audio-noir-root mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AudioLinesIcon className="size-5 text-sky-400/70" />
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
                Agente STT · Estación de Audio
              </p>
            </div>
            <h1 className="bg-gradient-to-r from-white via-white/85 to-white/50 bg-clip-text font-mono text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
              Biblioteca → Pre-proceso → STT → Downstream
            </h1>
            <p className="max-w-2xl font-mono text-[11px] leading-relaxed text-white/45">
              Centro operativo del Motor de Transcripción: audios importados,
              desduplicación, cola Deepgram y mapa de post-procesamiento hacia
              Purifier, Molecular y Grafo.
            </p>
          </div>

          <Link
            href="/ingesta"
            className="font-mono text-[10px] text-sky-400/80 underline-offset-2 hover:underline"
          >
            Ingesta general →
          </Link>
        </div>

        {error ? (
          <p className="rounded border border-red-500/25 bg-red-500/10 px-3 py-2 font-mono text-[10px] text-red-200/90">
            {error}
          </p>
        ) : null}

        {phase === "dedup-ready" && dedupBadge ? (
          <p className="rounded border border-amber-500/25 bg-amber-500/8 px-3 py-2 font-mono text-[10px] text-amber-200/90">
            {dedupBadge} posible{dedupBadge === 1 ? "" : "s"} duplicado
            {dedupBadge === 1 ? "" : "s"} detectado{dedupBadge === 1 ? "" : "s"}.
            Revisá la pestaña Pre-proceso.
          </p>
        ) : null}

        {pendingPurifyCount > 0 ? (
          <p className="rounded border border-violet-500/25 bg-violet-500/8 px-3 py-2 font-mono text-[10px] text-violet-200/90">
            {pendingPurifyCount} audio{pendingPurifyCount === 1 ? "" : "s"}{" "}
            transcrito{pendingPurifyCount === 1 ? "" : "s"} esperando purificación.{" "}
            <button
              type="button"
              onClick={() => setActiveTab("downstream")}
              className="text-violet-100 underline underline-offset-2"
            >
              Ir a Downstream →
            </button>
          </p>
        ) : inValidationCount > 0 ? (
          <p className="rounded border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 font-mono text-[10px] text-emerald-200/90">
            {inValidationCount} audio{inValidationCount === 1 ? "" : "s"} listo
            {inValidationCount === 1 ? "" : "s"} en{" "}
            <Link href="/validar" className="underline underline-offset-2">
              Validar →
            </Link>
          </p>
        ) : null}

        <div className="rounded border border-white/10 bg-black/25 px-3 py-3">
          <div className="mb-2 flex items-center gap-2">
            <WavesIcon className="size-3.5 text-sky-300/80" />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
              Flujo operacional de audio
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
                  <ArrowRightIcon className="size-3 text-white/30" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </header>

      <nav
        className="flex flex-wrap gap-2"
        aria-label="Secciones de la estación de audio"
      >
        {STATION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all",
              activeTab === tab.id
                ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/65",
            )}
          >
            {tab.label}
            {tab.id === "preprocess" && dedupBadge ? (
              <span className="ml-1.5 text-amber-300">({dedupBadge})</span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-1">
        {activeTab === "library" ? <AudioLibraryPanel /> : null}
        {activeTab === "preprocess" ? <PreprocessPanel /> : null}
        {activeTab === "stt" ? <SttQueuePanel /> : null}
        {activeTab === "downstream" ? <DownstreamPanel /> : null}
      </div>
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
