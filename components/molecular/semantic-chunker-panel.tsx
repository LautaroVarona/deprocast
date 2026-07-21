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
          <ZapIcon className="size-4 text-primary" />
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Agente 01 · Chunkeador Semántico
          </p>
        </div>
        <h2 className="font-mono text-lg text-muted-foreground">
          Acelerador de Partículas
        </h2>
        <p className="text-xs text-muted-foreground">
          Inyectá materia densa manualmente o elegí un documento del archivo del
          sistema.
        </p>
      </header>

      {batchMode ? (
        <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary/70">
            Calibración secuencial
          </p>
          <p className="font-mono text-xs text-foreground/85">
            Documento {batchIndex + 1}/{batchQueue.length}:{" "}
            {batchQueue[batchIndex]?.title ?? "—"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={stopBatchCalibration}
            className="mt-2 border-border bg-transparent font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            Detener calibración total
          </Button>
        </div>
      ) : null}

      <div className="flex gap-1 rounded-md border border-border p-0.5">
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
              ? "bg-muted/40 text-foreground"
              : "text-muted-foreground hover:text-muted-foreground",
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
              ? "bg-muted/40 text-foreground"
              : "text-muted-foreground hover:text-muted-foreground",
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
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
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
              className="w-full rounded-md border border-border bg-foreground/40 px-3 py-2 font-mono text-xs text-muted-foreground outline-none transition focus:border-primary/40 focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
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
            <div className="rounded-md border border-border bg-card/80 px-3 py-2 font-mono text-[10px] text-muted-foreground">
              <span className="text-muted-foreground">{selectedSource.title}</span>
              {selectedSource.strongestTag ? (
                <span className="ml-2 text-accent">
                  #{selectedSource.strongestTag.label}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Fuente de origen
            </span>
            <input
              type="text"
              value={fuenteOrigen}
              onChange={(event) => setFuenteOrigen(event.target.value)}
              disabled={isLocked}
              placeholder="gemini-resumen · pdf-transcript · ingesta-manual"
              className="w-full rounded-md border border-border bg-foreground/40 px-3 py-2 font-mono text-xs text-muted-foreground outline-none transition focus:border-primary/40 focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
            />
          </label>
        </div>
      )}

      <label className="block space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
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
            "w-full resize-y rounded-md border border-border bg-foreground/40 px-3 py-3 font-mono text-xs leading-relaxed text-muted-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-1 focus:ring-primary/20 disabled:opacity-50",
            isChunking && "molecular-text-pulse",
          )}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => void runChunker()}
          disabled={isBusy || isLocked || !textoOriginal.trim()}
          className="bg-primary/90 font-mono text-xs uppercase tracking-wider text-foreground hover:bg-primary/90"
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
            className="border-primary/30 bg-primary/5 font-mono text-xs uppercase tracking-wider text-primary/90 hover:bg-primary/10"
          >
            Calibrar todo
          </Button>
        ) : null}

        {(phase === "complete" || phase === "validating") && !batchMode ? (
          <Button
            type="button"
            variant="outline"
            onClick={resetPipeline}
            className="border-border bg-transparent font-mono text-xs text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground"
          >
            Reiniciar pipeline
          </Button>
        ) : null}

        {textoOriginal.length > 0 && (
          <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
            {textoOriginal.length.toLocaleString("es-AR")} chars
          </span>
        )}
      </div>

      {error ? (
        <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive/90">
          {error}
        </p>
      ) : null}

      {showParticles ? (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Partículas emitidas
            </p>
            <span className="font-mono text-xs tabular-nums text-primary/80">
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
