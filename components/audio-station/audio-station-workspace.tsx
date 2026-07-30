"use client";

import {
  AudioStationProvider,
  useAudioStation,
} from "@/components/audio-station/audio-station-context";
import { MetabolismView } from "@/components/audio-station/MetabolismView";
import { PauseQueueButton } from "@/components/pause-queue-button";
import { resolveAudioPipelineStage } from "@/lib/audio-station/pipeline-status";
import { cn } from "@/lib/utils";
import Link from "next/link";

function AudioStationShell() {
  const { error, assets, queueStatus, globalQueueStatus, reviewByAssetId, refresh } =
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

  const chips = [
    {
      id: "stt",
      label: "STT",
      count: assets.filter((a) => resolveStage(a).distill.steps.STT === "active")
        .length,
    },
    {
      id: "hitl",
      label: "HITL",
      count: assets.filter((a) => resolveStage(a).stage === "in_validation")
        .length,
    },
    {
      id: "coag",
      label: "COAG",
      count: assets.filter(
        (a) =>
          resolveStage(a).stage === "coagulated" ||
          resolveStage(a).stage === "validated",
      ).length,
    },
  ];

  return (
    <div className="mx-auto flex h-[calc(100vh-48px)] w-full max-w-[100vw] flex-col gap-2 overflow-y-hidden bg-zinc-950 px-3 py-3 sm:px-4">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-zinc-800 pb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#FFB000]">
          [ATANOR · AUDIO]
        </p>
        <div className="flex items-center gap-2">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className={cn(
                "border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[9px] text-zinc-400 rounded-none",
                chip.count > 0 && "border-[#FFB000]/40 text-[#FFB000]",
              )}
            >
              {chip.count} {chip.label}
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {(globalQueueStatus?.active ||
            (globalQueueStatus?.queuedCount ?? 0) > 0 ||
            globalQueueStatus?.paused) && (
            <PauseQueueButton
              paused={globalQueueStatus?.paused === true}
              onToggled={() => void refresh()}
            />
          )}
          <Link
            href="/ingesta"
            className="font-mono text-[9px] text-zinc-500 hover:text-[#FFB000]"
          >
            /ingesta →
          </Link>
        </div>
      </header>

      {error ? (
        <p className="shrink-0 border border-red-900 bg-zinc-950 px-3 py-1 font-mono text-[10px] text-red-500 rounded-none">
          {error}
        </p>
      ) : null}

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
