"use client";

import {
  CALIBRATION_HOTKEY_HINTS,
  DEFAULT_CALIBRATION_THRESHOLD,
} from "@/lib/ingesta/x-bookmarks/types";
import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";
import { cn } from "@/lib/utils";

type XBookmarkConfigPanelProps = {
  threshold: number;
  onThresholdChange: (value: number) => void;
  pendingCount: number;
  calibratedCount: number;
  enrichedCount: number;
  onStartCalibration: () => void;
  onProcess: () => void;
  isProcessing?: boolean;
  canStart: boolean;
  className?: string;
};

export function XBookmarkConfigPanel({
  threshold,
  onThresholdChange,
  pendingCount,
  calibratedCount,
  enrichedCount,
  onStartCalibration,
  onProcess,
  isProcessing = false,
  canStart,
  className,
}: XBookmarkConfigPanelProps) {
  return (
    <div className={cn("space-y-4 rounded-lg border border-border bg-muted/20 p-4", className)}>
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          X-Bookmark-Calibrator
        </p>
        <h2 className="mt-1 text-sm font-semibold">Configuración de umbral</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Los marcadores con puntaje ≥ umbral se enriquecen con título, tags y vínculos
          existenciales.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
        <div className="rounded border border-border px-2 py-1.5 text-center">
          <p className="text-muted-foreground">Pendientes</p>
          <p className="text-lg font-semibold tabular-nums">{pendingCount}</p>
        </div>
        <div className="rounded border border-border px-2 py-1.5 text-center">
          <p className="text-muted-foreground">Calibrados</p>
          <p className="text-lg font-semibold tabular-nums">{calibratedCount}</p>
        </div>
        <div className="rounded border border-border px-2 py-1.5 text-center">
          <p className="text-muted-foreground">Enriquecidos</p>
          <p className="text-lg font-semibold tabular-nums">{enrichedCount}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="x-threshold" className="text-xs font-medium">
            Umbral mínimo
          </label>
          <span className="font-mono text-sm font-semibold tabular-nums">≥ {threshold}</span>
        </div>
        <input
          id="x-threshold"
          type="range"
          min={MIN_BASE_WEIGHT}
          max={MAX_BASE_WEIGHT}
          step={1}
          value={threshold}
          onChange={(event) => onThresholdChange(Number(event.target.value))}
          className="h-2 w-full accent-primary"
        />
        <p className="text-[10px] text-muted-foreground">
          Por defecto: {DEFAULT_CALIBRATION_THRESHOLD}. Solo pasan marcadores de alta gravedad.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canStart}
          onClick={onStartCalibration}
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 font-mono text-[10px] text-primary-foreground disabled:opacity-50"
        >
          Iniciar calibración (foco)
          {pendingCount > 0 ? ` · ${pendingCount}` : ""}
        </button>
        <button
          type="button"
          disabled={calibratedCount === 0 || isProcessing}
          onClick={onProcess}
          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 font-mono text-[10px] hover:bg-muted disabled:opacity-50"
        >
          {isProcessing ? "Procesando…" : "Procesar umbral"}
        </button>
      </div>

      <div className="rounded border border-dashed border-border px-3 py-2">
        <p className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
          Atajos en modo foco
        </p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          {CALIBRATION_HOTKEY_HINTS.map((hint, index) => (
            <span key={hint.label}>
              {index > 0 ? " · " : null}
              <span className="text-foreground">{hint.label}</span> → {hint.description}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
