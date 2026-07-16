"use client";

import { useBabel } from "@/components/babel/babel-context";
import type {
  SemanticMapEdge,
  SemanticMapNode,
  SemanticMapNodeKind,
  SemanticMapSnapshot,
} from "@/lib/castillo/semantic-map-types";
import { cn } from "@/lib/utils";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2Icon, NetworkIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type FilterKind = "all" | SemanticMapNodeKind;

const KIND_LABELS: Record<SemanticMapNodeKind, string> = {
  yo: "YO",
  persona: "Personas",
  proyecto: "Proyectos",
  cuaderno: "Cuadernos",
};

const KIND_COLORS: Record<SemanticMapNodeKind, string> = {
  yo: "border-amber-400/70 bg-amber-500/20 text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.35)]",
  persona: "border-cyan-400/40 bg-cyan-500/10 text-cyan-50",
  proyecto: "border-violet-400/40 bg-violet-500/10 text-violet-50",
  cuaderno: "border-emerald-400/40 bg-emerald-500/10 text-emerald-50",
};

type MapNodeData = {
  label: string;
  kind: SemanticMapNodeKind;
  subtitle?: string | null;
  deepLink: string | null;
  dimmed: boolean;
  highlighted: boolean;
};

function SemanticNode({ data }: NodeProps) {
  const d = data as MapNodeData;
  return (
    <div
      className={cn(
        "castillo-card min-w-[100px] max-w-[160px] rounded-xl border px-3 py-2 text-center transition-opacity duration-300",
        KIND_COLORS[d.kind],
        d.dimmed && "opacity-20",
        d.highlighted && "ring-2 ring-amber-300/80 opacity-100",
        d.kind === "yo" && "min-w-[120px] px-4 py-3",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/30" />
      <p
        className={cn(
          "font-mono text-[9px] uppercase tracking-[0.16em] text-white/45",
          d.kind === "yo" && "text-amber-200/70",
        )}
      >
        {KIND_LABELS[d.kind]}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-xs font-semibold",
          d.kind === "yo" && "text-sm tracking-wide",
        )}
      >
        {d.label}
      </p>
      {d.subtitle ? (
        <p className="mt-0.5 truncate text-[10px] text-white/40">{d.subtitle}</p>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!bg-white/30" />
    </div>
  );
}

const nodeTypes = { semantic: SemanticNode };

function radialLayout(
  nodes: SemanticMapNode[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  positions.set("yo", { x: 0, y: 0 });

  const groups: Record<Exclude<SemanticMapNodeKind, "yo">, SemanticMapNode[]> = {
    persona: [],
    proyecto: [],
    cuaderno: [],
  };
  for (const node of nodes) {
    if (node.kind === "yo") continue;
    groups[node.kind].push(node);
  }

  const rings: Array<{
    kind: Exclude<SemanticMapNodeKind, "yo">;
    radius: number;
  }> = [
    { kind: "proyecto", radius: 220 },
    { kind: "persona", radius: 340 },
    { kind: "cuaderno", radius: 460 },
  ];

  for (const ring of rings) {
    const items = groups[ring.kind];
    const n = Math.max(items.length, 1);
    items.forEach((node, index) => {
      const angle = (index / n) * Math.PI * 2 - Math.PI / 2;
      positions.set(node.id, {
        x: Math.cos(angle) * ring.radius,
        y: Math.sin(angle) * ring.radius,
      });
    });
  }

  return positions;
}

export function CastilloSemanticMap() {
  const { universeFetch } = useBabel();
  const [snapshot, setSnapshot] = useState<SemanticMapSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await universeFetch("/api/castillo/semantic-map", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        snapshot?: SemanticMapSnapshot;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el mapa semántico.");
      }
      setSnapshot(data.snapshot ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de carga.");
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }, [universeFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const queryLower = query.trim().toLowerCase();

  const visibleNodes = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.nodes.filter((node) => {
      if (filter !== "all" && node.kind !== filter && node.kind !== "yo") {
        return false;
      }
      return true;
    });
  }, [snapshot, filter]);

  const visibleIds = useMemo(
    () => new Set(visibleNodes.map((n) => n.id)),
    [visibleNodes],
  );

  const positions = useMemo(
    () => radialLayout(visibleNodes),
    [visibleNodes],
  );

  const flowNodes: Node[] = useMemo(() => {
    return visibleNodes.map((node) => {
      const matchesQuery =
        !queryLower ||
        node.label.toLowerCase().includes(queryLower) ||
        (node.subtitle?.toLowerCase().includes(queryLower) ?? false);
      const hasQuery = queryLower.length > 0;
      const pos = positions.get(node.id) ?? { x: 0, y: 0 };

      return {
        id: node.id,
        type: "semantic",
        position: pos,
        draggable: node.kind !== "yo",
        data: {
          label: node.label,
          kind: node.kind,
          subtitle: node.subtitle,
          deepLink: node.deepLink,
          dimmed: hasQuery && !matchesQuery,
          highlighted: hasQuery && matchesQuery,
        } satisfies MapNodeData,
      };
    });
  }, [visibleNodes, positions, queryLower]);

  const flowEdges: Edge[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.edges
      .filter(
        (edge: SemanticMapEdge) =>
          visibleIds.has(edge.source) && visibleIds.has(edge.target),
      )
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.synthetic ? undefined : edge.relationType,
        animated: edge.synthetic === true,
        style: {
          stroke: edge.synthetic
            ? "rgba(251, 191, 36, 0.35)"
            : "rgba(255,255,255,0.18)",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "rgba(255,255,255,0.25)",
          width: 14,
          height: 14,
        },
      }));
  }, [snapshot, visibleIds]);

  const selected = useMemo(
    () => snapshot?.nodes.find((n) => n.id === selectedId) ?? null,
    [snapshot, selectedId],
  );

  return (
    <div className="castillo-semantic-map relative flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-black/30 px-3 py-2">
        <div className="relative min-w-[180px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscador semántico…"
            className="w-full rounded-lg border border-white/10 bg-black/40 py-1.5 pl-8 pr-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-amber-500/40"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", "Todos"],
              ["persona", "Personas"],
              ["proyecto", "Proyectos"],
              ["cuaderno", "Cuadernos"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                filter === value
                  ? "bg-amber-500/20 text-amber-100"
                  : "text-white/40 hover:bg-white/5 hover:text-white/70",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-white/50">
            <Loader2Icon className="size-4 animate-spin" />
            Trazando el cosmos personal…
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-rose-200">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={1.8}
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            className="!bg-transparent"
          >
            <Background color="rgba(255,255,255,0.06)" gap={22} size={1} />
            <Controls className="!border-white/10 !bg-black/60 !shadow-none [&>button]:!border-white/10 [&>button]:!bg-black/40 [&>button]:!text-white/70" />
          </ReactFlow>
        )}

        {selected ? (
          <div className="absolute bottom-4 left-4 right-4 z-10 max-w-sm rounded-xl border border-white/10 bg-black/80 p-3 backdrop-blur-md sm:right-auto">
            <p className="font-mono text-[10px] uppercase tracking-wider text-amber-200/70">
              {KIND_LABELS[selected.kind]}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{selected.label}</p>
            {selected.subtitle ? (
              <p className="text-xs text-white/45">{selected.subtitle}</p>
            ) : null}
            <p className="mt-1 text-[11px] text-white/35">
              Grado · {selected.degree}
            </p>
            {selected.deepLink ? (
              <Link
                href={selected.deepLink}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100 hover:bg-amber-500/20"
              >
                <NetworkIcon className="size-3" />
                Abrir
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
