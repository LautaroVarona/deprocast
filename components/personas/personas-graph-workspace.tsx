"use client";

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
import { cn } from "@/lib/utils";
import { GitBranchIcon, Loader2Icon, NetworkIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { personaSlugFromName } from "@/lib/personas/slug";

export function PersonasGraphWorkspace() {
  const [mode, setMode] = useState<PersonaGraphViewMode>("mixed");
  const [snapshot, setSnapshot] = useState<PersonaGraphSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<PersonaGraphEdge | null>(null);
  const [linkDraft, setLinkDraft] = useState<PersonaRelationDraft | null>(null);
  const [showLinkForm, setShowLinkForm] = useState(false);

  const loadGraph = useCallback(async (viewMode: PersonaGraphViewMode) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/personas/graph?mode=${encodeURIComponent(viewMode)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const data: { snapshot: PersonaGraphSnapshot } = await response.json();
      setSnapshot(data.snapshot);
      setSelectedNodeId(null);
      setSelectedEdge(null);
    } catch {
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGraph(mode);
  }, [loadGraph, mode]);

  const selectedNode = snapshot?.nodes.find((n) => n.id === selectedNodeId);

  const handleLinkRequest = (draft: PersonaRelationDraft) => {
    setLinkDraft(draft);
    setShowLinkForm(true);
    setSelectedNodeId(null);
    setSelectedEdge(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2 sm:px-6">
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setMode("exclusive")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              mode === "exclusive"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                : "text-muted-foreground hover:bg-muted/60",
            )}
          >
            Exclusivo
          </button>
          <button
            type="button"
            onClick={() => setMode("mixed")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              mode === "mixed"
                ? "bg-violet-500/15 text-violet-600 dark:text-violet-300"
                : "text-muted-foreground hover:bg-muted/60",
            )}
          >
            Mixto
          </button>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">
          {mode === "exclusive"
            ? "Personas · Shift+arrastrar entre personas"
            : "Personas + proyectos + campos · Shift+arrastrar para vincular"}
        </p>
        {snapshot && (
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {snapshot.nodes.length} nodos · {snapshot.edges.length} aristas
          </span>
        )}
      </div>

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
            <p>Sin nodos para visualizar. Creá personas primero.</p>
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
              <p className="font-mono text-[10px] text-muted-foreground uppercase">
                Arista seleccionada
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
