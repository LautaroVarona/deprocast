"use client";

import { useMolecular } from "@/components/molecular/molecular-context";
import { ParticleCard } from "@/components/molecular/particle-card";
import { Button } from "@/components/ui/button";
import { ARCHIVO_KIND_LABELS, type ArchivoKind } from "@/lib/archivo/types";
import { cn } from "@/lib/utils";
import {
  DatabaseIcon,
  Loader2Icon,
  PenLineIcon,
  ZapIcon,
} from "lucide-react";
import { useEffect } from "react";

export function SemanticChunkerPanel() {
  const {
    phase,
    textoOriginal,
    fuenteOrigen,
    particulas,
    isBusy,
    error,
    inputMode,
    selectedSourceId,
    availableSources,
    isLoadingSources,
    batchMode,
    batchQueue,
    batchIndex,
    setTextoOriginal,
    setFuenteOrigen,
    setInputMode,
    setSelectedSourceId,
    loadSources,
    loadSourceContent,
    runChunker,
    resetPipeline,
    startBatchCalibration,
    stopBatchCalibration,
  } = useMolecular();

  useEffect(() => {
    if (inputMode === "archivo" && availableSources.length === 0) {
      void loadSources();
    }
  }, [inputMode, availableSources.length, loadSources]);

  const showParticles =
    particulas.length > 0 &&
    (phase === "disintegrating" ||
      phase === "calibrating" ||
      phase === "validating" ||
      phase === "complete");

  const isChunking = phase === "chunking";
  const isLocked =
    batchMode ||
    (phase !== "idle" && phase !== "complete" && phase !== "validating");

  const selectedSource = availableSources.find(
    (source) => source.id === selectedSourceId,
  );

  return (
    <section className="molecular-noir-panel flex flex-col gap-4 p-5">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <ZapIcon className="size-4 text-cyan-400/80" />
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
            Agente 01 · Chunkeador Semántico
          </p>
        </div>
        <h2 className="font-mono text-lg text-white/90">
          Acelerador de Partículas
        </h2>
        <p className="text-xs text-white/45">
          Inyectá materia densa manualmente o elegí un documento del archivo del
          sistema.
        </p>
      </header>

      {batchMode ? (
        <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-violet-200/70">
            Calibración secuencial
          </p>
          <p className="font-mono text-xs text-violet-100/85">
            Documento {batchIndex + 1}/{batchQueue.length}:{" "}
            {batchQueue[batchIndex]?.title ?? "—"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={stopBatchCalibration}
            className="mt-2 border-white/15 bg-transparent font-mono text-[10px] uppercase tracking-wider text-white/50"
          >
            Detener calibración total
          </Button>
        </div>
      ) : null}

      <div className="flex gap-1 rounded-md border border-white/10 p-0.5">
        <button
          type="button"
          disabled={isLocked}
          onClick={() => {
            setInputMode("manual");
            setSelectedSourceId(null);
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition",
            inputMode === "manual"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/70",
            isLocked && "opacity-50",
          )}
        >
          <PenLineIcon className="size-3.5" />
          Manual
        </button>
        <button
          type="button"
          disabled={isLocked}
          onClick={() => setInputMode("archivo")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition",
            inputMode === "archivo"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/70",
            isLocked && "opacity-50",
          )}
        >
          <DatabaseIcon className="size-3.5" />
          Desde Archivo
        </button>
      </div>

      {inputMode === "archivo" ? (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
              Documento del sistema
            </span>
            <select
              value={selectedSourceId ?? ""}
              disabled={isLocked || isBusy || isLoadingSources}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  setSelectedSourceId(null);
                  return;
                }
                void loadSourceContent(value);
              }}
              className="w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 font-mono text-xs text-white/80 outline-none transition focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50"
            >
              <option value="">
                {isLoadingSources
                  ? "Cargando documentos…"
                  : "Elegí un documento…"}
              </option>
              {availableSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.title} ·{" "}
                  {ARCHIVO_KIND_LABELS[source.kind as ArchivoKind] ?? source.kind}{" "}
                  ({source.charCount.toLocaleString("es-AR")} chars)
                </option>
              ))}
            </select>
          </label>

          {selectedSource ? (
            <div className="rounded-md border border-white/8 bg-black/40 px-3 py-2 font-mono text-[10px] text-white/40">
              <span className="text-white/55">{selectedSource.title}</span>
              {selectedSource.strongestTag ? (
                <span className="ml-2 text-amber-300/70">
                  #{selectedSource.strongestTag.label}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
              Fuente de origen
            </span>
            <input
              type="text"
              value={fuenteOrigen}
              onChange={(event) => setFuenteOrigen(event.target.value)}
              disabled={isLocked}
              placeholder="gemini-resumen · pdf-transcript · ingesta-manual"
              className="w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 font-mono text-xs text-white/80 outline-none transition focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50"
            />
          </label>
        </div>
      )}

      <label className="block space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
          Bloque denso
        </span>
        <textarea
          value={textoOriginal}
          onChange={(event) => setTextoOriginal(event.target.value)}
          disabled={isLocked || (inputMode === "archivo" && Boolean(selectedSourceId))}
          rows={8}
          placeholder={
            inputMode === "archivo"
              ? "Seleccioná un documento del archivo para cargar su contenido…"
              : "Pegá transcripciones, resúmenes de Gemini, PDFs convertidos a texto…"
          }
          className={cn(
            "w-full resize-y rounded-md border border-white/10 bg-black/60 px-3 py-3 font-mono text-xs leading-relaxed text-white/80 outline-none transition placeholder:text-white/20 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50",
            isChunking && "molecular-text-pulse",
          )}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => void runChunker()}
          disabled={isBusy || isLocked || !textoOriginal.trim()}
          className="bg-emerald-600/90 font-mono text-xs uppercase tracking-wider text-white hover:bg-emerald-500/90"
        >
          {isChunking ? (
            <>
              <Loader2Icon className="size-3.5 animate-spin" />
              Chunkeando…
            </>
          ) : (
            "Desintegrar →"
          )}
        </Button>

        {!batchMode && phase === "idle" ? (
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => void startBatchCalibration()}
            className="border-violet-500/30 bg-violet-500/5 font-mono text-xs uppercase tracking-wider text-violet-200/90 hover:bg-violet-500/10"
          >
            Calibrar todo
          </Button>
        ) : null}

        {(phase === "complete" || phase === "validating") && !batchMode ? (
          <Button
            type="button"
            variant="outline"
            onClick={resetPipeline}
            className="border-white/15 bg-transparent font-mono text-xs text-white/60 hover:bg-white/5 hover:text-white/80"
          >
            Reiniciar pipeline
          </Button>
        ) : null}

        {textoOriginal.length > 0 && (
          <span className="ml-auto font-mono text-[10px] tabular-nums text-white/30">
            {textoOriginal.length.toLocaleString("es-AR")} chars
          </span>
        )}
      </div>

      {error ? (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300/90">
          {error}
        </p>
      ) : null}

      {showParticles ? (
        <div className="space-y-3 border-t border-white/8 pt-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">
              Partículas emitidas
            </p>
            <span className="font-mono text-xs tabular-nums text-emerald-400/80">
              {particulas.length}
            </span>
          </div>

          <div
            className={cn(
              "grid gap-2 transition-opacity duration-700 sm:grid-cols-2",
              phase === "disintegrating" && "molecular-disintegrate-grid",
            )}
          >
            {particulas.map((particula, index) => (
              <ParticleCard
                key={particula.id}
                particula={particula}
                index={index}
                visible
                compact
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
