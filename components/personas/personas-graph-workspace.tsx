"use client";

import { useBabel } from "@/components/babel/babel-context";
import {
  PersonaRelationsSheet,
  type PersonaRelationDraft,
} from "@/components/personas/persona-relations-sheet";
import { PersonasForceGraph } from "@/components/personas/personas-force-graph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  PersonaGraphEdge,
  PersonaGraphSnapshot,
  PersonaGraphViewMode,
} from "@/lib/personas/model";
import { personaSlugFromName } from "@/lib/personas/slug";
import { GitBranchIcon, Loader2Icon, NetworkIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Props = {
  mode: PersonaGraphViewMode;
  onStatsChange?: (stats: { nodes: number; edges: number } | null) => void;
};

export function PersonasGraphWorkspace({ mode, onStatsChange }: Props) {
  const { universeFetch } = useBabel();
  const [snapshot, setSnapshot] = useState<PersonaGraphSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<PersonaGraphEdge | null>(null);
  const [linkDraft, setLinkDraft] = useState<PersonaRelationDraft | null>(null);
  const [showLinkForm, setShowLinkForm] = useState(false);

  const loadGraph = useCallback(
    async (viewMode: PersonaGraphViewMode) => {
      setIsLoading(true);
      try {
        const response = await universeFetch(
          `/api/personas/graph?mode=${encodeURIComponent(viewMode)}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const data: { snapshot: PersonaGraphSnapshot } = await response.json();
        setSnapshot(data.snapshot);
        onStatsChange?.({
          nodes: data.snapshot.nodes.length,
          edges: data.snapshot.edges.length,
        });
        setSelectedNodeId(null);
        setSelectedEdge(null);
      } catch {
        setSnapshot(null);
        onStatsChange?.(null);
      } finally {
        setIsLoading(false);
      }
    },
    [onStatsChange, universeFetch],
  );

  useEffect(() => {
    void loadGraph(mode);
  }, [loadGraph, mode]);

  useEffect(() => {
    return () => onStatsChange?.(null);
  }, [onStatsChange]);

  const selectedNode = snapshot?.nodes.find((n) => n.id === selectedNodeId);

  const handleLinkRequest = (draft: PersonaRelationDraft) => {
    setLinkDraft(draft);
    setShowLinkForm(true);
    setSelectedNodeId(null);
    setSelectedEdge(null);
  };

  const edgeLabel = (edge: PersonaGraphEdge) => {
    const source =
      snapshot?.nodes.find((n) => n.id === edge.source)?.nombrePrincipal ??
      "…";
    const target =
      snapshot?.nodes.find((n) => n.id === edge.target)?.nombrePrincipal ??
      "…";
    return `${source} ↔ ${target}`;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 font-mono text-[10px] text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Simulando subgrafo…
          </div>
        ) : snapshot && snapshot.nodes.length > 0 ? (
          <PersonasForceGraph
            snapshot={snapshot}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdge?.id ?? null}
            onSelectNode={setSelectedNodeId}
            onSelectEdge={setSelectedEdge}
            onLinkRequest={handleLinkRequest}
            linkMode={mode}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <NetworkIcon className="size-8 opacity-40" />
            <p>Sin nodos verificados en este universo.</p>
          </div>
        )}
      </div>

      {(selectedNode || selectedEdge) && (
        <aside className="shrink-0 border-t border-border bg-muted/20 px-4 py-3 sm:px-6">
          {selectedNode && (
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <GitBranchIcon className="size-3.5 text-emerald-500" />
                  <p className="text-sm font-semibold">{selectedNode.nombrePrincipal}</p>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {selectedNode.kind}
                  </Badge>
                </div>
                {selectedNode.aliases.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Alias: {selectedNode.aliases.join(", ")}
                  </p>
                )}
              </div>
              {selectedNode.kind === "persona" && (
                <Link
                  href={`/personas/${personaSlugFromName(selectedNode.nombrePrincipal)}`}
                  className="text-xs text-primary hover:underline"
                >
                  Abrir ficha →
                </Link>
              )}
            </div>
          )}

          {selectedEdge && !selectedNode && (
            <div className="space-y-1">
              <p className="font-mono text-[10px] text-emerald-500 uppercase">
                {edgeLabel(selectedEdge)}
              </p>
              <p className="text-sm font-medium">{selectedEdge.tipoRelacion}</p>
              {selectedEdge.rolPrincipal && (
                <p className="text-xs text-violet-400">
                  Rol: {selectedEdge.rolPrincipal}
                </p>
              )}
              {selectedEdge.contexto ? (
                <p className="text-xs text-muted-foreground">{selectedEdge.contexto}</p>
              ) : (
                <p className="text-xs italic text-muted-foreground">Sin contexto</p>
              )}
              <Button
                type="button"
                variant="destructive"
                size="xs"
                className="mt-2"
                onClick={async () => {
                  await fetch(
                    `/api/personas/relations/${encodeURIComponent(selectedEdge.id)}`,
                    { method: "DELETE" },
                  );
                  void loadGraph(mode);
                }}
              >
                Eliminar arista
              </Button>
            </div>
          )}
        </aside>
      )}

      <PersonaRelationsSheet
        open={showLinkForm}
        draft={linkDraft}
        source={
          linkDraft
            ? { id: linkDraft.personaId, nombrePrincipal: linkDraft.personaName }
            : null
        }
        onOpenChange={(open) => {
          setShowLinkForm(open);
          if (!open) setLinkDraft(null);
        }}
        onCreated={() => void loadGraph(mode)}
      />
    </div>
  );
}
