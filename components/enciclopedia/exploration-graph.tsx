"use client";

import { useEnciclopedia } from "@/components/enciclopedia/enciclopedia-context";
import { ForceGraph } from "@/components/grafo/force-graph";
import type { GraphSnapshot } from "@/components/grafo/types";
import { useMemo } from "react";

export function ExplorationGraph() {
  const { sessionEntries, sessionEdges, currentEntry, selectEntry } =
    useEnciclopedia();

  const snapshot = useMemo((): GraphSnapshot => {
    const degreeMap = new Map<string, number>();

    for (const edge of sessionEdges) {
      degreeMap.set(edge.fromEntryId, (degreeMap.get(edge.fromEntryId) ?? 0) + 1);
      degreeMap.set(edge.toEntryId, (degreeMap.get(edge.toEntryId) ?? 0) + 1);
    }

    return {
      nodes: sessionEntries.map((entry) => ({
        id: entry.id,
        primaryName: entry.title,
        type: "concepto",
        confidence: 1,
        degree: degreeMap.get(entry.id) ?? 0,
        aliasesCount: entry.explorableTerms.length,
      })),
      edges: sessionEdges.map((edge) => ({
        id: edge.id,
        source: edge.fromEntryId,
        target: edge.toEntryId,
        relationType: edge.triggerTerm,
        context: `Exploración enciclopédica vía «${edge.triggerTerm}»`,
        weight: null,
        confidence: 1,
      })),
    };
  }, [sessionEntries, sessionEdges]);

  return (
    <section className="enciclopedia-noir-panel flex min-h-[360px] flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent/60">
          04 · Conecta
        </p>
        <h2 className="font-mono text-sm font-medium text-muted-foreground">
          Tu camino de aprendizaje
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Grafo de tu sesión actual. Clic en un nodo para volver a esa entrada.
        </p>
      </div>

      <div className="relative min-h-[300px] flex-1">
        {snapshot.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            Explorá conceptos para ver cómo se conectan en tu camino.
          </div>
        ) : (
          <ForceGraph
            snapshot={snapshot}
            selectedId={currentEntry?.id ?? null}
            onSelect={(id) => {
              if (id) selectEntry(id);
            }}
          />
        )}
      </div>
    </section>
  );
}
