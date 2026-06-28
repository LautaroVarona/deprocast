"use client";

import { useAudioStation } from "@/components/audio-station/audio-station-context";
import type { DuplicateReason } from "@/lib/audio-station/types";
import { cn } from "@/lib/utils";
import {
  CopyIcon,
  Loader2Icon,
  ScanSearchIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

const REASON_LABELS: Record<DuplicateReason, string> = {
  normalized_name: "Mismo nombre base",
  copy_suffix: "Sufijo de copia (1)(2)",
  number_collision: "Colisión numérica",
};

export function DeduplicatePanel() {
  const {
    scan,
    phase,
    isBusy,
    runDedupScan,
    deleteDuplicates,
    markDuplicatesForProcessing,
  } = useAudioStation();

  const allDuplicateIds = useMemo(
    () => [...new Set(scan?.groups.flatMap((group) => group.duplicateIds) ?? [])],
    [scan],
  );

  const handleDeleteAll = async () => {
    if (allDuplicateIds.length === 0) return;

    try {
      const deletedCount = await deleteDuplicates(allDuplicateIds);
      toast.success(
        deletedCount === 1
          ? "1 copia eliminada"
          : `${deletedCount} copias eliminadas`,
      );
    } catch {
      toast.error("No se pudieron eliminar las copias.");
    }
  };

  const handleProcessAnyway = () => {
    markDuplicatesForProcessing();
    toast.info("Las copias se procesarán igual en STT.", {
      description: "Podés volver a escanear cuando quieras.",
    });
  };

  return (
    <section className="audio-noir-panel space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CopyIcon className="size-4 text-amber-400/80" />
            <h2 className="font-mono text-sm font-medium text-white/90">
              Desduplicar
            </h2>
          </div>
          <p className="max-w-xl font-mono text-[10px] leading-relaxed text-white/45">
            Escanea nombres repetidos, sufijos (1)/(2)/copia y secuencias
            numéricas compartidas. Después elegís eliminar copias o procesarlas
            igual.
          </p>
        </div>

        <button
          type="button"
          disabled={isBusy}
          onClick={() => void runDedupScan()}
          className={cn(
            "inline-flex items-center gap-2 rounded border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all",
            isBusy
              ? "cursor-wait border-white/8 text-white/30"
              : "border-amber-500/35 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15",
          )}
        >
          {phase === "scanning" ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <ScanSearchIcon className="size-3.5" />
          )}
          Escanear duplicados
        </button>
      </div>

      {!scan ? (
        <p className="rounded border border-dashed border-white/10 py-6 text-center font-mono text-[10px] text-white/35">
          Ejecutá el escaneo para detectar copias en la biblioteca.
        </p>
      ) : scan.groups.length === 0 ? (
        <p className="rounded border border-emerald-500/20 bg-emerald-500/5 py-6 text-center font-mono text-[10px] text-emerald-300/80">
          Sin duplicados detectados · {scan.totalAssets} archivos únicos
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <span className="font-mono text-[10px] text-amber-200/90">
              {scan.duplicateCount} copia{scan.duplicateCount === 1 ? "" : "s"} en{" "}
              {scan.groups.length} grupo{scan.groups.length === 1 ? "" : "s"}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isBusy || allDuplicateIds.length === 0}
                onClick={() => void handleDeleteAll()}
                className="inline-flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-red-200 transition-colors hover:bg-red-500/15 disabled:opacity-40"
              >
                <Trash2Icon className="size-3" />
                Eliminar copias
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleProcessAnyway}
                className="inline-flex items-center gap-1.5 rounded border border-white/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/70 transition-colors hover:border-sky-500/30 hover:text-sky-200"
              >
                Procesar igual
              </button>
            </div>
          </div>

          <ul className="max-h-[360px] space-y-3 overflow-y-auto">
            {scan.groups.map((group) => (
              <li
                key={group.id}
                className="rounded border border-white/8 bg-black/25 p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-white/8 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
                    {REASON_LABELS[group.reason]}
                  </span>
                  <span className="font-mono text-[9px] text-white/30">
                    clave: {group.normalizedKey}
                  </span>
                </div>

                <ul className="space-y-1.5">
                  {group.members.map((member) => {
                    const isKeep = member.id === group.keepId;

                    return (
                      <li
                        key={member.id}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded px-2 py-1.5 font-mono text-[10px]",
                          isKeep
                            ? "border border-emerald-500/25 bg-emerald-500/8 text-emerald-100/90"
                            : "border border-white/6 text-white/55",
                        )}
                      >
                        <span className="min-w-0 truncate">{member.filename}</span>
                        <span className="shrink-0 text-[9px] uppercase tracking-wider">
                          {isKeep ? "conservar" : "copia"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
