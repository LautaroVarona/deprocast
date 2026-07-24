"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useBabel } from "@/components/babel/babel-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchWithUniverse } from "@/lib/babel/universe-fetch";
import { cn } from "@/lib/utils";
import { ForceGraph } from "@/components/grafo/force-graph";
import { GraphSemanticSearch } from "@/components/grafo/graph-semantic-search";
import {
  colorForType,
  type DuplicateCandidate,
  type GraphSnapshot,
  type NodeSummary,
  type NeighborhoodResult,
  type StatsResponse,
} from "@/components/grafo/types";
import { searchGraphSnapshot } from "@/lib/kg/graph-search";

type Tab = "grafo" | "proyectos" | "stats" | "duplicados";

type ProjectPeopleItem = {
  person: NodeSummary;
  relationType: string;
  context: string;
};

type RelatedProjectItem = {
  project: NodeSummary;
  sharedNeighbors: number;
};

export function GrafoWorkspace() {
  const { activeUniverse, isLoading: isUniverseLoading } = useBabel();
  const activeSlug = activeUniverse?.slug;
  const requestIdRef = useRef(0);
  const [tab, setTab] = useState<Tab>("grafo");
  const [snapshot, setSnapshot] = useState<GraphSnapshot>({
    nodes: [],
    edges: [],
    centerNodeId: null,
  });
  const [excludeCode, setExcludeCode] = useState(true);
  const [enabledTypes, setEnabledTypes] = useState<Set<string>>(new Set());
  const [loadingGraph, setLoadingGraph] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NeighborhoodResult | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [merging, setMerging] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectPeople, setProjectPeople] = useState<ProjectPeopleItem[]>([]);
  const [relatedProjects, setRelatedProjects] = useState<RelatedProjectItem[]>([]);
  const [loadingProjectPanels, setLoadingProjectPanels] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadGraph = useCallback(async () => {
    if (isUniverseLoading) return;

    const requestId = ++requestIdRef.current;
    setLoadingGraph(true);
    try {
      const res = await fetchWithUniverse(
        `/api/kg/graph?excludeCode=${excludeCode}&limit=2000`,
        { universeSlug: activeSlug, cache: "no-store" },
      );
      if (!res.ok) throw new Error("No se pudo cargar el grafo");
      const data = (await res.json()) as GraphSnapshot;
      if (requestId !== requestIdRef.current) return;
      setSnapshot(data);
      setEnabledTypes((prev) => {
        if (prev.size > 0) return prev;
        return new Set(data.nodes.map((n) => n.type));
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setSnapshot({ nodes: [], edges: [] });
      toast.error(error instanceof Error ? error.message : "Error al cargar el grafo");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingGraph(false);
      }
    }
  }, [activeSlug, excludeCode, isUniverseLoading]);

  const loadStats = useCallback(async () => {
    if (isUniverseLoading) return;

    try {
      const res = await fetchWithUniverse("/api/kg/stats", {
        universeSlug: activeSlug,
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No se pudieron cargar las estadisticas");
      setStats((await res.json()) as StatsResponse);
    } catch (error) {
      setStats(null);
      toast.error(error instanceof Error ? error.message : "Error en estadisticas");
    }
  }, [activeSlug, isUniverseLoading]);

  const loadDuplicates = useCallback(async () => {
    if (isUniverseLoading) return;

    try {
      const res = await fetchWithUniverse("/api/kg/duplicates?limit=200", {
        universeSlug: activeSlug,
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No se pudieron detectar duplicados");
      const data = (await res.json()) as { candidates: DuplicateCandidate[] };
      setDuplicates(data.candidates);
    } catch (error) {
      setDuplicates([]);
      toast.error(error instanceof Error ? error.message : "Error en duplicados");
    }
  }, [activeSlug, isUniverseLoading]);

  useEffect(() => {
    setSnapshot({ nodes: [], edges: [] });
    setStats(null);
    setDuplicates([]);
    setSelectedId(null);
    setDetail(null);
    setEnabledTypes(new Set());
  }, [activeSlug]);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    void loadStats();
    void loadDuplicates();
  }, [loadStats, loadDuplicates]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    setLoadingDetail(true);
    fetch(`/api/kg/nodes/${selectedId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) setDetail(data as NeighborhoodResult | null);
      })
      .catch(() => {
        if (active) setDetail(null);
      })
      .finally(() => {
        if (active) setLoadingDetail(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  const availableTypes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of snapshot.nodes) {
      counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [snapshot]);

  const typeFilteredSnapshot = useMemo<GraphSnapshot>(() => {
    if (enabledTypes.size === 0) return snapshot;
    const nodes = snapshot.nodes.filter(
      (n) => enabledTypes.has(n.type) || n.id === snapshot.centerNodeId,
    );
    const ids = new Set(nodes.map((n) => n.id));
    const edges = snapshot.edges.filter(
      (e) => ids.has(e.source) && ids.has(e.target),
    );
    return {
      nodes,
      edges,
      centerNodeId: snapshot.centerNodeId ?? null,
    };
  }, [snapshot, enabledTypes]);

  const { snapshot: filteredSnapshot, matches: searchMatches } = useMemo(() => {
    const result = searchGraphSnapshot(typeFilteredSnapshot, searchQuery);
    return {
      snapshot: {
        ...result.snapshot,
        centerNodeId: typeFilteredSnapshot.centerNodeId ?? null,
      },
      matches: result.matches,
    };
  }, [typeFilteredSnapshot, searchQuery]);

  const projectNodes = useMemo(
    () => snapshot.nodes.filter((n) => n.type === "proyecto"),
    [snapshot.nodes],
  );

  useEffect(() => {
    if (!projectId && projectNodes.length > 0) {
      setProjectId(projectNodes[0].id);
    }
  }, [projectId, projectNodes]);

  useEffect(() => {
    if (!projectId) {
      setProjectPeople([]);
      setRelatedProjects([]);
      return;
    }
    let active = true;
    setLoadingProjectPanels(true);

    Promise.all([
      fetch(`/api/kg/projects/${projectId}/people`).then((res) =>
        res.ok ? res.json() : { people: [] },
      ),
      fetch(`/api/kg/projects/${projectId}/related?limit=30`).then((res) =>
        res.ok ? res.json() : { related: [] },
      ),
    ])
      .then(([peopleRes, relatedRes]) => {
        if (!active) return;
        setProjectPeople((peopleRes as { people?: ProjectPeopleItem[] }).people ?? []);
        setRelatedProjects(
          (relatedRes as { related?: RelatedProjectItem[] }).related ?? [],
        );
      })
      .catch(() => {
        if (!active) return;
        setProjectPeople([]);
        setRelatedProjects([]);
      })
      .finally(() => {
        if (active) setLoadingProjectPanels(false);
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  function toggleType(type: string, addToSelection: boolean) {
    setEnabledTypes((prev) => {
      if (addToSelection) {
        const next = new Set(prev);
        if (next.has(type)) {
          next.delete(type);
          if (next.size === 0) return new Set([type]);
        } else {
          next.add(type);
        }
        return next;
      }
      return new Set([type]);
    });
  }

  async function handleMerge(keepId: string, dropId: string) {
    setMerging(`${keepId}:${dropId}`);
    try {
      const res = await fetch("/api/kg/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepId, dropId }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "No se pudo fusionar");
      }
      toast.success("Nodos fusionados");
      await Promise.all([loadGraph(), loadStats(), loadDuplicates()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al fusionar");
    } finally {
      setMerging(null);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <h1 className="mr-2 text-sm font-semibold">Grafo de Conocimiento</h1>
        <div className="flex items-center gap-1">
          {(["grafo", "proyectos", "stats", "duplicados"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors",
                tab === t
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {t === "stats" ? "Estadísticas" : t === "proyectos" ? "Proyectos" : t}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {stats && (
            <span className="hidden text-xs text-muted-foreground sm:block">
              {stats.stats.totalNodes} nodos · {stats.stats.totalEdges} relaciones ·{" "}
              {stats.stats.totalMentions} menciones
            </span>
          )}
          <a
            href="/api/kg/export?format=json"
            className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            Export JSON
          </a>
          <a
            href="/api/kg/export?format=graphml"
            className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            GraphML
          </a>
        </div>
      </div>

      {tab === "grafo" && (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
              <GraphSemanticSearch
                query={searchQuery}
                onQueryChange={setSearchQuery}
                matches={searchMatches}
                visibleCount={filteredSnapshot.nodes.length}
                totalCount={typeFilteredSnapshot.nodes.length}
                onSelectMatch={setSelectedId}
              />
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={excludeCode}
                  onChange={(e) => setExcludeCode(e.target.checked)}
                />
                Ocultar código
              </label>
              <span className="text-xs text-muted-foreground">
                Clic = un tipo · Ctrl+clic = varios
              </span>
              {availableTypes.map(([type, count]) => {
                const enabled = enabledTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={(event) =>
                      toggleType(type, event.ctrlKey || event.metaKey)
                    }
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-opacity",
                      enabled ? "border-border" : "border-transparent opacity-40",
                    )}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: colorForType(type) }}
                    />
                    {type}
                    <span className="text-muted-foreground">{count}</span>
                  </button>
                );
              })}
              {loadingGraph && (
                <span className="text-xs text-muted-foreground">cargando…</span>
              )}
              {searchQuery.trim() && (
                <span className="text-xs text-muted-foreground">
                  {filteredSnapshot.nodes.length} nodo
                  {filteredSnapshot.nodes.length === 1 ? "" : "s"} ·{" "}
                  {filteredSnapshot.edges.length} relación
                  {filteredSnapshot.edges.length === 1 ? "" : "es"}
                </span>
              )}
            </div>
            <div className="relative min-h-0 flex-1 bg-muted/20">
              <ForceGraph
                snapshot={filteredSnapshot}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <div className="pointer-events-none absolute bottom-2 left-2 text-xs text-muted-foreground">
                Rueda: zoom · Arrastrar: mover · Clic: detalle
              </div>
            </div>
          </div>

          <NodeDetailPanel
            detail={detail}
            loading={loadingDetail}
            onSelect={setSelectedId}
          />
        </div>
      )}

      {tab === "proyectos" && (
        <ProjectRelationsPanel
          projects={projectNodes}
          selectedProjectId={projectId}
          onSelectProject={setProjectId}
          people={projectPeople}
          related={relatedProjects}
          loading={loadingProjectPanels}
          onJumpToNode={(id) => {
            setSelectedId(id);
            setTab("grafo");
          }}
        />
      )}

      {tab === "stats" && <StatsPanel stats={stats} onSelect={(id) => {
        setSelectedId(id);
        setTab("grafo");
      }} />}

      {tab === "duplicados" && (
        <DuplicatesPanel
          duplicates={duplicates}
          merging={merging}
          onMerge={handleMerge}
        />
      )}
    </div>
  );
}

function ProjectRelationsPanel({
  projects,
  selectedProjectId,
  onSelectProject,
  people,
  related,
  loading,
  onJumpToNode,
}: {
  projects: GraphSnapshot["nodes"];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  people: ProjectPeopleItem[];
  related: RelatedProjectItem[];
  loading: boolean;
  onJumpToNode: (id: string) => void;
}) {
  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) ?? projects[0] ?? null;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-3">
      <section className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">Proyectos</h3>
        {projects.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No hay nodos de tipo proyecto.
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  className={cn(
                    "w-full rounded-md px-2 py-1 text-left transition-colors",
                    selectedProject?.id === project.id
                      ? "bg-muted text-foreground"
                      : "hover:bg-muted/60",
                  )}
                  onClick={() => onSelectProject(project.id)}
                >
                  {project.primaryName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">Personas vinculadas</h3>
        {selectedProject && (
          <p className="mt-1 text-xs text-muted-foreground">
            Proyecto: {selectedProject.primaryName}
          </p>
        )}
        {loading ? (
          <p className="mt-2 text-sm text-muted-foreground">Cargando…</p>
        ) : people.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Sin personas vinculadas detectadas.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {people.map((item) => (
              <li key={`${item.person.id}:${item.relationType}`}>
                <button
                  className="text-left hover:underline"
                  onClick={() => onJumpToNode(item.person.id)}
                >
                  {item.person.primaryName}
                </button>
                <span className="text-muted-foreground"> · {item.relationType}</span>
                {item.context && (
                  <p className="text-xs text-muted-foreground">{item.context}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">Proyectos relacionados</h3>
        {loading ? (
          <p className="mt-2 text-sm text-muted-foreground">Cargando…</p>
        ) : related.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Sin proyectos relacionados detectados.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {related.map((item) => (
              <li key={item.project.id}>
                <button
                  className="text-left hover:underline"
                  onClick={() => onJumpToNode(item.project.id)}
                >
                  {item.project.primaryName}
                </button>
                <span className="text-muted-foreground">
                  {" "}
                  · vecinos compartidos: {item.sharedNeighbors}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NodeDetailPanel({
  detail,
  loading,
  onSelect,
}: {
  detail: NeighborhoodResult | null;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-l border-border p-4">
      {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {!loading && !detail && (
        <p className="text-sm text-muted-foreground">
          Seleccioná un nodo para ver sus relaciones, alias y evidencia.
        </p>
      )}
      {detail && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: colorForType(detail.node.type) }}
              />
              <Badge variant="outline">{detail.node.type}</Badge>
              <span className="text-xs text-muted-foreground">
                conf {Math.round(detail.node.confidence * 100)}%
              </span>
            </div>
            <h2 className="mt-1 text-base font-semibold break-words">
              {detail.node.primaryName}
            </h2>
            {detail.node.aliases.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Alias: {detail.node.aliases.join(", ")}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Relaciones ({detail.edges.length})
            </h3>
            <ul className="mt-1 space-y-1">
              {detail.edges.slice(0, 60).map((edge) => (
                <li key={`${edge.id}:${edge.direction}`} className="text-sm">
                  <button
                    className="text-left hover:underline"
                    onClick={() => onSelect(edge.neighbor.id)}
                  >
                    <span className="text-muted-foreground">
                      {edge.direction === "outgoing"
                        ? "→ "
                        : edge.direction === "incoming"
                          ? "← "
                          : "↔ "}
                      {edge.relationType}:{" "}
                    </span>
                    {edge.neighbor.primaryName}
                    {edge.weight != null && (
                      <span className="text-muted-foreground"> ({edge.weight})</span>
                    )}
                  </button>
                  {edge.context && (
                    <p className="text-xs text-muted-foreground">{edge.context}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {detail.mentions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Menciones ({detail.mentions.length})
              </h3>
              <ul className="mt-1 space-y-1">
                {detail.mentions.map((m) => (
                  <li key={m.id} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{m.sourceType}</span>{" "}
                    — {m.fragment}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function StatsPanel({
  stats,
  onSelect,
}: {
  stats: StatsResponse | null;
  onSelect: (id: string) => void;
}) {
  if (!stats) {
    return <div className="p-4 text-sm text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-3">
      <section className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">Resumen</h3>
        <dl className="mt-2 space-y-1 text-sm">
          <Row label="Nodos" value={stats.stats.totalNodes} />
          <Row label="Relaciones" value={stats.stats.totalEdges} />
          <Row label="Menciones" value={stats.stats.totalMentions} />
          <Row label="Fuentes" value={stats.stats.totalSources} />
        </dl>
        <h4 className="mt-3 text-xs font-semibold uppercase text-muted-foreground">
          Por tipo
        </h4>
        <ul className="mt-1 space-y-0.5 text-sm">
          {stats.stats.nodesByType.map((n) => (
            <li key={n.type} className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: colorForType(n.type) }}
                />
                {n.type}
              </span>
              <span className="text-muted-foreground">{n.count}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">Centralidad (peso · grado)</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {stats.centrality.map((c) => (
            <li key={c.node.id}>
              <button
                className="text-left hover:underline"
                onClick={() => onSelect(c.node.id)}
              >
                {c.node.primaryName}
              </button>
              <span className="text-muted-foreground">
                {" "}
                · {c.weightedDegree}/{c.degree}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold">Ideas recurrentes</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {stats.repeatedIdeas.length === 0 && (
            <li className="text-muted-foreground">Sin menciones aún.</li>
          )}
          {stats.repeatedIdeas.map((i) => (
            <li key={i.node.id}>
              <button
                className="text-left hover:underline"
                onClick={() => onSelect(i.node.id)}
              >
                {i.node.primaryName}
              </button>
              <span className="text-muted-foreground"> · {i.mentionCount}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function DuplicatesPanel({
  duplicates,
  merging,
  onMerge,
}: {
  duplicates: DuplicateCandidate[];
  merging: string | null;
  onMerge: (keepId: string, dropId: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      {duplicates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No se detectaron duplicados candidatos.
        </p>
      ) : (
        <ul className="space-y-2">
          {duplicates.map((dup) => {
            const key = `${dup.a.id}:${dup.b.id}`;
            const keyRev = `${dup.b.id}:${dup.a.id}`;
            const busy = merging === key || merging === keyRev;
            return (
              <li
                key={key}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-sm"
              >
                <Badge variant="outline">{dup.type}</Badge>
                <span className="font-medium">{dup.a.primaryName}</span>
                <span className="text-muted-foreground">↔</span>
                <span className="font-medium">{dup.b.primaryName}</span>
                <span className="text-xs text-muted-foreground">
                  {dup.reason} · {Math.round(dup.similarity * 100)}%
                </span>
                <div className="ml-auto flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onMerge(dup.a.id, dup.b.id)}
                  >
                    Conservar “{truncate(dup.a.primaryName)}”
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onMerge(dup.b.id, dup.a.id)}
                  >
                    Conservar “{truncate(dup.b.primaryName)}”
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function truncate(value: string): string {
  return value.length > 16 ? `${value.slice(0, 15)}…` : value;
}
