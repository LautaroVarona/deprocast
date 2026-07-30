"use client";

import { AudioMetabolismCard } from "@/components/audio-station/audio-metabolism-card";
import { useAudioStation } from "@/components/audio-station/audio-station-context";
import { useBabel } from "@/components/babel/babel-context";
import { DeduplicatePanel } from "@/components/audio-station/deduplicate-panel";
import { LiveProcessingPanel } from "@/components/live-processing-panel";
import { PauseQueueButton } from "@/components/pause-queue-button";
import { UploadDropzone } from "@/components/upload-dropzone";
import type { AssetMetabolismSummary } from "@/lib/audio-station/metabolism";
import {
  matchesMetabolismFilter,
  resolveMetabolismCardTone,
  type MetabolismFilter,
} from "@/lib/audio-station/asset-display";
import { resolveAudioPipelineStage } from "@/lib/audio-station/pipeline-status";
import { fetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const FILTERS: Array<{ id: MetabolismFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "processing", label: "Procesando" },
  { id: "attention", label: "Atención" },
  { id: "hitl", label: "HITL" },
  { id: "alma", label: "Coagulado" },
];

export function MetabolismView() {
  const { activeUniverse } = useBabel();
  const {
    assets,
    scan,
    queueStatus,
    globalQueueStatus,
    reviewByAssetId,
    refresh,
    refreshKey,
  } = useAudioStation();

  const [filter, setFilter] = useState<MetabolismFilter>("all");
  const [metabolismByAsset, setMetabolismByAsset] = useState<
    Record<string, AssetMetabolismSummary>
  >({});
  const [isLoadingMetabolism, setIsLoadingMetabolism] = useState(false);
  const [showDedup, setShowDedup] = useState(false);

  const queuedIds = useMemo(
    () => new Set(queueStatus?.queuedIds ?? []),
    [queueStatus?.queuedIds],
  );
  const purifyingIds = useMemo(
    () => new Set(queueStatus?.purifyingIds ?? []),
    [queueStatus?.purifyingIds],
  );
  const activeId = queueStatus?.active?.id ?? null;
  const globalActive = globalQueueStatus?.active ?? null;
  const outsideUniverse = Boolean(
    globalActive && (!activeId || globalActive.id !== activeId),
  );
  const showLivePanel = Boolean(
    globalActive ||
      (globalQueueStatus?.queuedCount ?? 0) > 0 ||
      globalQueueStatus?.paused,
  );
  const isPaused = globalQueueStatus?.paused === true;

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const pipeline = resolveAudioPipelineStage(asset, {
        queuedIds,
        activeId,
        purifyingIds,
        reviewByAssetId,
      });
      const tone = resolveMetabolismCardTone(pipeline);
      return matchesMetabolismFilter(tone, filter);
    });
  }, [assets, queuedIds, activeId, purifyingIds, reviewByAssetId, filter]);

  const loadMetabolism = useCallback(async () => {
    const idsWithKnowledge = assets
      .filter((asset) => asset.transcript || reviewByAssetId.has(asset.id))
      .map((asset) => asset.id);

    if (idsWithKnowledge.length === 0) {
      setMetabolismByAsset({});
      return;
    }

    setIsLoadingMetabolism(true);
    try {
      const data = await fetchJson<{
        byAssetId: Record<string, AssetMetabolismSummary>;
      }>(
        `/api/audio-station/metabolism?assetIds=${encodeURIComponent(idsWithKnowledge.join(","))}`,
      );
      setMetabolismByAsset(data.byAssetId ?? {});
    } catch {
      setMetabolismByAsset({});
    } finally {
      setIsLoadingMetabolism(false);
    }
  }, [assets, reviewByAssetId]);

  useEffect(() => {
    void loadMetabolism();
  }, [loadMetabolism, refreshKey]);

  const dedupBadge = scan && scan.groups.length > 0 ? scan.duplicateCount : null;

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-3 overflow-y-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#FFB000]">
          [HUD · DESTILACIÓN AUDIO]
        </p>
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider rounded-none",
              filter === item.id
                ? "border-[#FFB000]/50 bg-zinc-950 text-[#FFB000]"
                : "border-zinc-800 text-zinc-500 hover:border-zinc-600",
            )}
          >
            {item.label}
          </button>
        ))}
        {dedupBadge ? (
          <button
            type="button"
            onClick={() => setShowDedup((value) => !value)}
            className="border border-[#FFB000]/30 px-2 py-0.5 font-mono text-[9px] text-[#FFB000]/80 rounded-none"
          >
            Dup ({dedupBadge})
          </button>
        ) : null}
        {showLivePanel || isPaused ? (
          <PauseQueueButton
            paused={isPaused}
            onToggled={() => void refresh()}
          />
        ) : null}
        {isLoadingMetabolism ? (
          <span className="ml-auto flex items-center gap-1 font-mono text-[9px] text-zinc-600">
            <Loader2Icon className="size-3 animate-spin" />
            sync…
          </span>
        ) : null}
      </div>

      {showDedup && scan ? (
        <div className="max-h-24 shrink-0 overflow-hidden border border-zinc-800 bg-zinc-950 p-2">
          <DeduplicatePanel />
        </div>
      ) : null}

      {showLivePanel ? (
        <div className="shrink-0">
          <LiveProcessingPanel
            refreshKey={refreshKey}
            outsideUniverse={outsideUniverse}
            onStopped={() => void refresh()}
            onQueueIdle={() => void refresh()}
          />
        </div>
      ) : null}

      {/* Viewport inmutable: scroll horizontal, sin scroll vertical masivo */}
      <div
        className={cn(
          "flex flex-1 flex-row items-start gap-4 overflow-x-auto overflow-y-hidden p-1",
          "scrollbar-thin scrollbar-thumb-zinc-800",
        )}
      >
        <UploadDropzone
          variant="hud"
          universeSlug={activeUniverse?.slug}
          onUploaded={() => void refresh()}
        />

        {filteredAssets.length === 0 ? (
          <div className="flex h-[280px] min-w-[240px] items-center justify-center border border-dashed border-zinc-800 bg-zinc-950 px-6 font-mono text-[10px] text-zinc-600 rounded-none">
            {assets.length === 0
              ? "[SIN MATERIA PRIMA]"
              : "[FILTRO VACÍO]"}
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <AudioMetabolismCard
              key={asset.id}
              asset={asset}
              queuedIds={queuedIds}
              purifyingIds={purifyingIds}
              activeId={activeId}
              reviewByAssetId={reviewByAssetId}
              metabolism={metabolismByAsset[asset.id]}
              onRefresh={() => void refresh()}
              tactical
            />
          ))
        )}
      </div>
    </div>
  );
}
