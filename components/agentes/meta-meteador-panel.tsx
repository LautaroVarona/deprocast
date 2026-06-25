"use client";

import { MetaMeteadorModal } from "@/components/agentes/meta-meteador-modal";
import { Button } from "@/components/ui/button";
import type { MetaMeteadorCoverage } from "@/lib/meta-meteador/types";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function MetaMeteadorPanel() {
  const [coverage, setCoverage] = useState<MetaMeteadorCoverage | null>(null);
  const [loadingCoverage, setLoadingCoverage] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadCoverage = useCallback(async () => {
    setLoadingCoverage(true);
    try {
      const response = await fetch("/api/agentes/meta-meteador", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("No se pudo cargar la cobertura");
      }
      const data = (await response.json()) as MetaMeteadorCoverage;
      setCoverage(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al cargar cobertura",
      );
    } finally {
      setLoadingCoverage(false);
    }
  }, []);

  useEffect(() => {
    void loadCoverage();
  }, [loadCoverage]);

  const pct =
    coverage && coverage.totalDocuments > 0
      ? Math.round((coverage.withMeta / coverage.totalDocuments) * 100)
      : 0;

  return (
    <>
      <section className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                🏷️
              </span>
              <div>
                <h2 className="text-sm font-semibold text-zinc-50">
                  Meta-Meteador
                </h2>
                <p className="text-xs text-zinc-500">
                  Indexación de metadatos desacoplados para documentos validados
                </p>
              </div>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-zinc-400">
              Asigna título (3–7 palabras si no es manual), matriz cuántica y
              relevancia 1–12 para 6 áreas. Solo procesa archivos sin ID
              Meta-Meteador. Los títulos nuevos se aplican cuando vos los
              aceptás en la sesión en vivo.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            disabled={modalOpen}
            onClick={() => setModalOpen(true)}
            className="gap-2"
          >
            {modalOpen ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SparklesIcon className="size-4" />
            )}
            Ejecutar Meta-Meteador
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Cobertura de metadatos</span>
            {loadingCoverage ? (
              <span>cargando…</span>
            ) : coverage ? (
              <span>
                {coverage.withMeta}/{coverage.totalDocuments} documentos ({pct}%)
                · {coverage.pending} pendientes
              </span>
            ) : (
              <span>—</span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </section>

      <MetaMeteadorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onComplete={() => void loadCoverage()}
      />
    </>
  );
}
