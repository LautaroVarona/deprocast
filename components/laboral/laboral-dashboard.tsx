"use client";

import { ChallengeBoard } from "@/components/laboral/challenge-board";
import { LaboralCsvDropzone } from "@/components/laboral/csv-dropzone";
import type { LaboralChallenge } from "@/lib/laboral/types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function LaboralDashboard() {
  const [challenges, setChallenges] = useState<LaboralChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadChallenges = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/laboral/challenges", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar los retos");
      }

      setChallenges(data.challenges ?? []);
    } catch {
      setChallenges([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges, refreshKey]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-amber-600">Sección Laboral · Varona</p>
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Volver al dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Retos de automatización IA
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Importá el CSV exportado desde el Excel de control del despacho. Cada
          fila se convierte en un Markdown con frontmatter DeProcast y se
          visualiza en un tablero por Onda (Área), priorizando retos con peso
          crítico 10–12.
        </p>
      </header>

      <LaboralCsvDropzone onImported={() => setRefreshKey((key) => key + 1)} />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Tablero por Onda</h2>
        <ChallengeBoard challenges={challenges} isLoading={isLoading} />
      </section>
    </div>
  );
}
