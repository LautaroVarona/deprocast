"use client";

import type {
  AudioAssetSummary,
  AudioStationPhase,
  DeduplicateScanResult,
} from "@/lib/audio-station/types";
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
  active: { id: string } | null;
  queuedIds: string[];
  queuedCount: number;
};

type ReviewRecord = {
  reviewId: string;
  assetId?: string;
};

type AudioStationContextValue = {
  phase: AudioStationPhase;
  assets: AudioAssetSummary[];
  scan: DeduplicateScanResult | null;
  queueStatus: ProcessStatus | null;
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
  const [phase, setPhase] = useState<AudioStationPhase>("idle");
  const [assets, setAssets] = useState<AudioAssetSummary[]>([]);
  const [scan, setScan] = useState<DeduplicateScanResult | null>(null);
  const [queueStatus, setQueueStatus] = useState<ProcessStatus | null>(null);
  const [reviewByAssetId, setReviewByAssetId] = useState<Map<string, string>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [skipDuplicates, setSkipDuplicates] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [stationData, statusData, reviewData] = await Promise.all([
        fetchJson<{
          assets: AudioAssetSummary[];
          scan: DeduplicateScanResult;
        }>("/api/audio-station/deduplicate"),
        fetchJson<ProcessStatus>("/api/process/status"),
        fetch("/api/purifier/review", { cache: "no-store" }).then(async (res) =>
          res.ok ? ((await res.json()) as { records?: ReviewRecord[] }) : { records: [] },
        ),
      ]);

      const reviewMap = new Map<string, string>();
      for (const record of reviewData.records ?? []) {
        if (record.assetId) {
          reviewMap.set(record.assetId, record.reviewId);
        }
      }

      setAssets(stationData.assets);
      setScan(stationData.scan);
      setQueueStatus(statusData);
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
  }, [skipDuplicates]);

  const runDedupScan = useCallback(async () => {
    setIsBusy(true);
    setPhase("scanning");
    setError(null);

    try {
      const data = await fetchJson<{
        assets: AudioAssetSummary[];
        scan: DeduplicateScanResult;
      }>("/api/audio-station/deduplicate");

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
  }, []);

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
      Boolean(queueStatus?.active),
    [assets, queueStatus],
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
