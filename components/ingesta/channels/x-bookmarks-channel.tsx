"use client";

import { XBookmarkConfigPanel } from "@/components/ingesta/x-bookmarks/x-bookmark-config-panel";
import { XBookmarkDropzone } from "@/components/ingesta/x-bookmarks/x-bookmark-dropzone";
import { XBookmarkEnrichedPanel } from "@/components/ingesta/x-bookmarks/x-bookmark-enriched-panel";
import { XBookmarkFocusCalibrator } from "@/components/ingesta/x-bookmarks/x-bookmark-focus-calibrator";
import { useIngesta } from "@/components/ingesta/ingesta-context";
import {
  DEFAULT_CALIBRATION_THRESHOLD,
  type XBookmarkRecord,
} from "@/lib/ingesta/x-bookmarks/types";
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const THRESHOLD_STORAGE_KEY = "deprocast:x-bookmark-threshold";

export function XBookmarksChannel() {
  const { setGravity } = useIngesta();
  const [pending, setPending] = useState<XBookmarkRecord[]>([]);
  const [enriched, setEnriched] = useState<XBookmarkRecord[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [threshold, setThreshold] = useState(DEFAULT_CALIBRATION_THRESHOLD);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);

  useEffect(() => {
    setGravity({ sourceType: "social_bookmark", onda: "x-bookmark" });
  }, [setGravity]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THRESHOLD_STORAGE_KEY);
      if (stored) {
        const value = Number(stored);
        if (value >= 1 && value <= 12) setThreshold(value);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pendingRes, enrichedRes] = await Promise.all([
        fetch("/api/ingesta/x-bookmarks?pending=true", { cache: "no-store" }),
        fetch("/api/ingesta/x-bookmarks?status=enriched", { cache: "no-store" }),
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPending(data.bookmarks ?? []);
        setCounts(data.counts ?? {});
      }

      if (enrichedRes.ok) {
        const data = await enrichedRes.json();
        setEnriched(data.bookmarks ?? []);
      }
    } catch {
      toast.error("No se pudieron cargar los marcadores.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleThresholdChange = (value: number) => {
    setThreshold(value);
    try {
      localStorage.setItem(THRESHOLD_STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ingesta/x-bookmarks", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo importar el archivo.");
      }

      const { imported = 0, updated = 0, skipped = 0 } = data as {
        imported?: number;
        updated?: number;
        skipped?: number;
      };
      const ready = imported + updated;

      if (ready > 0) {
        const parts: string[] = [];
        if (imported > 0) {
          parts.push(
            `${imported} nuevo${imported === 1 ? "" : "s"}`,
          );
        }
        if (updated > 0) {
          parts.push(
            `${updated} actualizado${updated === 1 ? "" : "s"}`,
          );
        }
        toast.success(`${parts.join(", ")} — listos para calibrar.`, {
          description:
            skipped > 0
              ? `${skipped} omitido${skipped === 1 ? "" : "s"} (ya calibrados o enriquecidos).`
              : "Usá «Iniciar calibración (foco)» para puntuar cada marcador.",
        });
      } else if (skipped > 0) {
        toast.info(
          `Los ${skipped} marcadores ya estaban importados y calibrados.`,
          {
            description:
              "Si solo querés calibrar pendientes, revisá el contador de arriba.",
          },
        );
      } else {
        toast.warning("No se encontraron marcadores nuevos en el archivo.");
      }

      setPending(data.bookmarks ?? []);
      void loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error de importación.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleCalibrated = (_bookmark: XBookmarkRecord, _weight: number) => {
    setPending((current) => current.filter((item) => item.id !== _bookmark.id));
    setCounts((current) => ({
      ...current,
      pending: Math.max(0, (current.pending ?? 0) - 1),
      calibrated: (current.calibrated ?? 0) + 1,
    }));
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/ingesta/x-bookmarks/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo procesar el umbral.");
      }

      toast.success(`${data.processed} marcador${data.processed === 1 ? "" : "es"} enriquecido${data.processed === 1 ? "" : "s"}.`, {
        description: `Indexados en KG: ${data.kgIngested ?? 0}.`,
      });
      void loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al procesar.");
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = useMemo(
    () => ({
      pending: counts.pending ?? pending.length,
      calibrated: counts.calibrated ?? 0,
      enriched: counts.enriched ?? enriched.length,
    }),
    [counts, pending.length, enriched.length],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2Icon className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="grid gap-4 lg:grid-cols-2">
        <XBookmarkDropzone onImport={handleImport} disabled={isImporting} />
        <XBookmarkConfigPanel
          threshold={threshold}
          onThresholdChange={handleThresholdChange}
          pendingCount={stats.pending}
          calibratedCount={stats.calibrated}
          enrichedCount={stats.enriched}
          onStartCalibration={() => setFocusOpen(true)}
          onProcess={() => void handleProcess()}
          isProcessing={isProcessing}
          canStart={pending.length > 0}
        />
      </div>

      <XBookmarkEnrichedPanel bookmarks={enriched} />

      <XBookmarkFocusCalibrator
        queue={pending}
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        onCalibrated={handleCalibrated}
        onComplete={() => void loadData()}
      />
    </div>
  );
}
