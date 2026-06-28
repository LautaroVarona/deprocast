"use client";

import { useMolecular } from "@/components/molecular/molecular-context";
import { ParticleCard } from "@/components/molecular/particle-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2Icon, ZapIcon } from "lucide-react";

export function SemanticChunkerPanel() {
  const {
    phase,
    textoOriginal,
    fuenteOrigen,
    particulas,
    isBusy,
    error,
    setTextoOriginal,
    setFuenteOrigen,
    runChunker,
    resetPipeline,
  } = useMolecular();

  const showParticles =
    particulas.length > 0 &&
    (phase === "disintegrating" ||
      phase === "calibrating" ||
      phase === "validating" ||
      phase === "complete");

  const isChunking = phase === "chunking";
  const isLocked =
    phase !== "idle" && phase !== "complete" && phase !== "validating";

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
          Inyectá materia densa. El pipeline la desintegrará en fragmentos con
          metadatos atómicos.
        </p>
      </header>

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

        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">
            Bloque denso
          </span>
          <textarea
            value={textoOriginal}
            onChange={(event) => setTextoOriginal(event.target.value)}
            disabled={isLocked}
            rows={8}
            placeholder="Pegá transcripciones, resúmenes de Gemini, PDFs convertidos a texto…"
            className={cn(
              "w-full resize-y rounded-md border border-white/10 bg-black/60 px-3 py-3 font-mono text-xs leading-relaxed text-white/80 outline-none transition placeholder:text-white/20 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50",
              isChunking && "molecular-text-pulse",
            )}
          />
        </label>
      </div>

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

        {(phase === "complete" || phase === "validating") && (
          <Button
            type="button"
            variant="outline"
            onClick={resetPipeline}
            className="border-white/15 bg-transparent font-mono text-xs text-white/60 hover:bg-white/5 hover:text-white/80"
          >
            Reiniciar pipeline
          </Button>
        )}

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
