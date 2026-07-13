"use client";

import { AudioMetabolismCard } from "@/components/audio-station/audio-metabolism-card";
import { useAudioStation } from "@/components/audio-station/audio-station-context";
import { DeduplicatePanel } from "@/components/audio-station/deduplicate-panel";
import { LiveProcessingPanel } from "@/components/live-processing-panel";
import { ProcessAllButton } from "@/components/process-all-button";
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
import { Loader2Icon, ShieldCheckIcon, WavesIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const FILTERS: Array<{ id: MetabolismFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "processing", label: "Procesando" },
  { id: "hitl", label: "Requiere validación" },
  { id: "alma", label: "Metabolizado" },
];

export function MetabolismFeed() {
  const {
    assets,
    scan,
    queueStatus,
    reviewByAssetId,
    refresh,
    refreshKey,
  } = useAudioStation();

  const [filter, setFilter] = useState<MetabolismFilter>("all");
  const [metabolismByAsset, setMetabolismByAsset] = useState<
    Record<string, AssetMetabolismSummary>
  >({});
  const [isLoadingMetabolism, setIsLoadingMetabolism] = useState(false);
  const [isPurifyingAll, setIsPurifyingAll] = useState(false);
  const [showDedup, setShowDedup] = useState(false);

  const queuedIds = useMemo(
    () => new Set(queueStatus?.queuedIds ?? []),
    [queueStatus?.queuedIds],
  );
  const activeId = queueStatus?.active?.id ?? null;

  const pendingCount = assets.filter(
    (asset) =>
      (asset.status === "PENDING" || asset.status === "ERROR") &&
      !queuedIds.has(asset.id) &&
      asset.id !== activeId,
  ).length;

  const pendingPurifyCount = useMemo(
    () =>
      assets.filter(
        (asset) =>
          resolveAudioPipelineStage(asset, {
            queuedIds,
            activeId,
            reviewByAssetId,
          }).stage === "pending_purify",
      ).length,
    [assets, queuedIds, activeId, reviewByAssetId],
  );

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const pipeline = resolveAudioPipelineStage(asset, {
        queuedIds,
        activeId,
        reviewByAssetId,
      });
      const tone = resolveMetabolismCardTone(pipeline);
      return matchesMetabolismFilter(tone, filter);
    });
  }, [assets, queuedIds, activeId, reviewByAssetId, filter]);

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

  const handlePurifyAll = async () => {
    if (pendingPurifyCount === 0 || isPurifyingAll) return;
    setIsPurifyingAll(true);
    try {
      const response = await fetch("/api/audio-station/purify-pending", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron purificar los audios.");
      }
      if (data.purified > 0) {
        toast.success(`${data.purified} audio(s) enviados a Validar.`);
      }
      void refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al purificar en lote.",
      );
    } finally {
      setIsPurifyingAll(false);
    }
  };

  const dedupBadge = scan && scan.groups.length > 0 ? scan.duplicateCount : null;

  return (
    <div className="space-y-4">
      <section className="audio-noir-panel space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <WavesIcon className="size-4 text-sky-400/80" />
              <h2 className="font-mono text-sm font-medium text-white/90">
                Feed de metabolización
              </h2>
            </div>
            <p className="max-w-2xl font-mono text-[10px] leading-relaxed text-white/45">
              Subí un audio y seguí su transformación en conocimiento. Las
              tarjetas se expanden con chunks, nodos del grafo y action items
              inyectados al calendario.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendingCount > 0 ? (
              <ProcessAllButton
                pendingCount={pendingCount}
                onQueued={() => void refresh()}
              />
            ) : null}
            {pendingPurifyCount > 0 ? (
              <button
                type="button"
                disabled={isPurifyingAll}
                onClick={() => void handlePurifyAll()}
                className="inline-flex items-center gap-1.5 rounded border border-violet-400/30 bg-violet-500/15 px-2.5 py-1 font-mono text-[9px] text-violet-100 hover:bg-violet-500/25 disabled:opacity-50"
              >
                {isPurifyingAll ? (
                  <Loader2Icon className="size-3 animate-spin" />
                ) : (
                  <ShieldCheckIcon className="size-3" />
                )}
                Purificar todos ({pendingPurifyCount})
              </button>
            ) : null}
          </div>
        </div>

        <UploadDropzone onUploaded={() => void refresh()} />

        {activeId ? (
          <LiveProcessingPanel refreshKey={refreshKey} />
        ) : null}

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-wider transition",
                filter === item.id
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                  : "border-white/10 text-white/40 hover:border-white/20",
              )}
            >
              {item.label}
            </button>
          ))}
          {dedupBadge ? (
            <button
              type="button"
              onClick={() => setShowDedup((value) => !value)}
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-wider",
                showDedup
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                  : "border-amber-500/25 text-amber-200/80",
              )}
            >
              Duplicados ({dedupBadge})
            </button>
          ) : null}
          {isLoadingMetabolism ? (
            <span className="ml-auto flex items-center gap-1 font-mono text-[9px] text-white/30">
              <Loader2Icon className="size-3 animate-spin" />
              Sincronizando conocimiento…
            </span>
          ) : null}
        </div>
      </section>

      {showDedup && scan ? (
        <section className="audio-noir-panel p-4">
          <DeduplicatePanel />
        </section>
      ) : null}

      {filteredAssets.length === 0 ? (
        <div className="audio-noir-panel py-16 text-center">
          <p className="font-mono text-[11px] text-white/40">
            {assets.length === 0
              ? "Arrastrá audios o seleccioná archivos para iniciar la metabolización."
              : "No hay audios en este filtro."}
          </p>
          {assets.length === 0 ? (
            <Link
              href="/ingesta"
              className="mt-3 inline-block font-mono text-[10px] text-sky-400/80 hover:underline"
            >
              Ingesta con metadatos →
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredAssets.map((asset) => (
            <AudioMetabolismCard
              key={asset.id}
              asset={asset}
              queuedIds={queuedIds}
              activeId={activeId}
              reviewByAssetId={reviewByAssetId}
              metabolism={metabolismByAsset[asset.id]}
              onRefresh={() => void refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
