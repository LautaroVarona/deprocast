"use client";

import type {
  AudioAssetSummary,
  AudioStationPhase,
  DeduplicateScanResult,
} from "@/lib/audio-station/types";
import { useBabel } from "@/components/babel/babel-context";
import { fetchWithUniverse } from "@/lib/babel/universe-fetch";
import { fetchJson } from "@/lib/fetch-json";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ProcessStatus = {
  active: {
    id: string;
    filename?: string;
    partialText?: string | null;
    status?: string;
  } | null;
  queuedIds: string[];
  queuedCount: number;
  purifyingIds: string[];
  paused?: boolean;
};

type ReviewRecord = {
  reviewId: string;
  assetId?: string;
};

type AudioStationContextValue = {
  phase: AudioStationPhase;
  assets: AudioAssetSummary[];
  scan: DeduplicateScanResult | null;
  /** Estado de cola filtrado al universo activo (para chips / cards). */
  queueStatus: ProcessStatus | null;
  /**
   * Estado global de la cola STT (sin filtrar por universo).
   * Sirve para ver/pausar jobs que corren fuera del universo activo.
   */
  globalQueueStatus: ProcessStatus | null;
  reviewByAssetId: Map<string, string>;
  isLoading: boolean;
  isBusy: boolean;
  error: string | null;
  refreshKey: number;
  refresh: () => Promise<void>;
  runDedupScan: () => Promise<void>;
  deleteDuplicates: (assetIds: string[]) => Promise<number>;
  markDuplicatesForProcessing: () => void;
};

const AudioStationContext = createContext<AudioStationContextValue | null>(
  null,
);

export function AudioStationProvider({ children }: { children: ReactNode }) {
  const { activeUniverse, isLoading: isUniverseLoading } = useBabel();
  const activeSlug = activeUniverse?.slug;
  const [phase, setPhase] = useState<AudioStationPhase>("idle");
  const [assets, setAssets] = useState<AudioAssetSummary[]>([]);
  const [scan, setScan] = useState<DeduplicateScanResult | null>(null);
  const [queueStatus, setQueueStatus] = useState<ProcessStatus | null>(null);
  const [globalQueueStatus, setGlobalQueueStatus] =
    useState<ProcessStatus | null>(null);
  const [reviewByAssetId, setReviewByAssetId] = useState<Map<string, string>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [skipDuplicates, setSkipDuplicates] = useState(false);

  const refresh = useCallback(async () => {
    if (isUniverseLoading) return;

    try {
      const [stationData, statusData, reviewData] = await Promise.all([
        fetchWithUniverse("/api/audio-station/deduplicate", {
          universeSlug: activeSlug,
        }).then(async (res) => {
          if (!res.ok) throw new Error("No se pudo cargar la estación de audio.");
          return res.json() as Promise<{
            assets: AudioAssetSummary[];
            scan: DeduplicateScanResult;
          }>;
        }),
        fetchJson<ProcessStatus>("/api/process/status"),
        fetchWithUniverse("/api/purifier/review", {
          universeSlug: activeSlug,
          cache: "no-store",
        }).then(async (res) =>
          res.ok ? ((await res.json()) as { records?: ReviewRecord[] }) : { records: [] },
        ),
      ]);

      const reviewMap = new Map<string, string>();
      for (const record of reviewData.records ?? []) {
        if (record.assetId) {
          reviewMap.set(record.assetId, record.reviewId);
        }
      }

      const allowedAssetIds = new Set(stationData.assets.map((asset) => asset.id));
      const filteredStatus: ProcessStatus | null = statusData
        ? {
            active:
              statusData.active && allowedAssetIds.has(statusData.active.id)
                ? statusData.active
                : null,
            queuedIds: statusData.queuedIds.filter((id) => allowedAssetIds.has(id)),
            queuedCount: statusData.queuedIds.filter((id) =>
              allowedAssetIds.has(id),
            ).length,
            purifyingIds: (statusData.purifyingIds ?? []).filter((id) =>
              allowedAssetIds.has(id),
            ),
            paused: statusData.paused ?? false,
          }
        : null;

      setAssets(stationData.assets);
      setScan(stationData.scan);
      setQueueStatus(filteredStatus);
      setGlobalQueueStatus(statusData);
      setReviewByAssetId(reviewMap);
      setError(null);
      setRefreshKey((key) => key + 1);

      setPhase((current) => {
        if (stationData.scan.groups.length > 0 && !skipDuplicates) {
          return "dedup-ready";
        }
        if (current === "dedup-ready" && stationData.scan.groups.length === 0) {
          return "dedup-applied";
        }
        return current === "scanning" || current === "error"
          ? current
          : current === "dedup-applied"
            ? current
            : "idle";
      });
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar la estación de audio.";
      setError(message);
      setPhase("error");
    } finally {
      setIsLoading(false);
    }
  }, [activeSlug, isUniverseLoading, skipDuplicates]);

  useEffect(() => {
    setAssets([]);
    setScan(null);
    setReviewByAssetId(new Map());
    setIsLoading(true);
  }, [activeSlug]);

  const runDedupScan = useCallback(async () => {
    setIsBusy(true);
    setPhase("scanning");
    setError(null);

    try {
      const response = await fetchWithUniverse("/api/audio-station/deduplicate", {
        universeSlug: activeSlug,
      });
      if (!response.ok) throw new Error("No se pudo escanear duplicados.");
      const data = (await response.json()) as {
        assets: AudioAssetSummary[];
        scan: DeduplicateScanResult;
      };

      setAssets(data.assets);
      setScan(data.scan);
      setPhase(data.scan.groups.length > 0 ? "dedup-ready" : "idle");
    } catch (scanError) {
      const message =
        scanError instanceof Error
          ? scanError.message
          : "No se pudo escanear duplicados.";
      setError(message);
      setPhase("error");
    } finally {
      setIsBusy(false);
    }
  }, [activeSlug]);

  const deleteDuplicates = useCallback(
    async (assetIds: string[]) => {
      setIsBusy(true);
      setError(null);

      try {
        const response = await fetch("/api/audio-station/deduplicate/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetIds }),
        });

        const payload = (await response.json()) as {
          deletedCount?: number;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudieron eliminar las copias.");
        }

        await refresh();
        setPhase("dedup-applied");
        return payload.deletedCount ?? 0;
      } catch (deleteError) {
        const message =
          deleteError instanceof Error
            ? deleteError.message
            : "No se pudieron eliminar las copias.";
        setError(message);
        setPhase("error");
        throw deleteError;
      } finally {
        setIsBusy(false);
      }
    },
    [refresh],
  );

  const markDuplicatesForProcessing = useCallback(() => {
    setSkipDuplicates(true);
    setPhase("idle");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasActiveWork = useMemo(
    () =>
      assets.some((asset) => asset.status === "PROCESSING") ||
      (queueStatus?.queuedCount ?? 0) > 0 ||
      (queueStatus?.purifyingIds?.length ?? 0) > 0 ||
      Boolean(queueStatus?.active) ||
      Boolean(globalQueueStatus?.active) ||
      (globalQueueStatus?.queuedCount ?? 0) > 0 ||
      globalQueueStatus?.paused === true,
    [assets, queueStatus, globalQueueStatus],
  );

  useEffect(() => {
    if (!hasActiveWork) return;

    const interval = setInterval(() => {
      void refresh();
    }, 2000);

    return () => clearInterval(interval);
  }, [hasActiveWork, refresh]);

  const value = useMemo<AudioStationContextValue>(
    () => ({
      phase,
      assets,
      scan,
      queueStatus,
      globalQueueStatus,
      reviewByAssetId,
      isLoading,
      isBusy,
      error,
      refreshKey,
      refresh,
      runDedupScan,
      deleteDuplicates,
      markDuplicatesForProcessing,
    }),
    [
      phase,
      assets,
      scan,
      queueStatus,
      globalQueueStatus,
      reviewByAssetId,
      isLoading,
      isBusy,
      error,
      refreshKey,
      refresh,
      runDedupScan,
      deleteDuplicates,
      markDuplicatesForProcessing,
    ],
  );

  return (
    <AudioStationContext.Provider value={value}>
      {children}
    </AudioStationContext.Provider>
  );
}

export function useAudioStation() {
  const context = useContext(AudioStationContext);
  if (!context) {
    throw new Error("useAudioStation debe usarse dentro de AudioStationProvider");
  }
  return context;
}
