"use client";

import { GrafoWorkspace } from "@/components/grafo/grafo-workspace";
import { cn } from "@/lib/utils";
import type {
  GraphRagCoreHit,
  GraphRagImpactZone,
  GraphRagOrbitConfirmed,
  GraphRagOrbitSuggested,
} from "@/lib/kg/graphrag-types";
import { Loader2Icon, SearchIcon, SparklesIcon } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { toast } from "sonner";

type ViewMode = "pensadero" | "clasico";

const AMBER = "#FFB000";

export function PensaderoWorkspace() {
  const [mode, setMode] = useState<ViewMode>("pensadero");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [zone, setZone] = useState<GraphRagImpactZone | null>(null);
  const [busyEdgeId, setBusyEdgeId] = useState<string | null>(null);

  const runSearch = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) {
      toast.error("Escribí una query para iluminar el Pensadero.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/kg/graphrag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = (await res.json()) as GraphRagImpactZone & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Fallo GraphRAG");
      setZone(data);
      if (data.core.length === 0) {
        toast.message("Sin impacto", {
          description: "No hay Quántomos indexados cercanos a esa query.",
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error en el Pensadero",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCoagulate = useCallback(
    async (edgeId: string) => {
      setBusyEdgeId(edgeId);
      try {
        const res = await fetch("/api/kg/graphrag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "coagulate", edgeId }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "No se pudo coagular");
        toast.success("Arista coagulada · reconocido=true");
        setZone((prev) => {
          if (!prev) return prev;
          const moved = prev.orbit.suggested.find((s) => s.edgeId === edgeId);
          const remaining = prev.orbit.suggested.filter(
            (s) => s.edgeId !== edgeId,
          );
          if (!moved) return { ...prev, orbit: { ...prev.orbit, suggested: remaining } };
          return {
            ...prev,
            orbit: {
              confirmed: prev.orbit.confirmed,
              suggested: remaining,
            },
          };
        });
        if (query.trim()) await runSearch(query);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error al coagular",
        );
      } finally {
        setBusyEdgeId(null);
      }
    },
    [query, runSearch],
  );

  const handleReject = useCallback(async (edgeId: string) => {
    setBusyEdgeId(edgeId);
    try {
      const res = await fetch("/api/kg/graphrag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", edgeId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo rechazar");
      toast.message("Sugerencia descartada");
      setZone((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          orbit: {
            ...prev.orbit,
            suggested: prev.orbit.suggested.filter((s) => s.edgeId !== edgeId),
          },
        };
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al rechazar",
      );
    } finally {
      setBusyEdgeId(null);
    }
  }, []);

  if (mode === "clasico") {
    return (
      <div className="flex h-full min-h-0 flex-col bg-zinc-950">
        <div className="flex items-center justify-between border-b border-[#FFB000]/30 px-4 py-2 font-mono text-xs text-amber-200/80">
          <span>VISTA CLÁSICA · Grafo KG</span>
          <button
            type="button"
            onClick={() => setMode("pensadero")}
            className="border border-[#FFB000]/40 px-2 py-1 text-[#FFB000] hover:bg-[#FFB000]/10"
          >
            ← Pensadero
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <GrafoWorkspace />
        </div>
      </div>
    );
  }

  const hasResults = Boolean(zone && (zone.core.length > 0 || query));

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950 font-mono text-amber-100">
      <header className="shrink-0 border-b border-[#FFB000]/30 px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#FFB000]/70">
              Deprocast OS · GraphRAG
            </p>
            <h1 className="text-lg tracking-wide text-[#FFB000]">
              PENSADERO
            </h1>
            <p className="mt-0.5 max-w-xl text-[11px] text-zinc-500">
              Búsqueda semántica + órbita por gravedad hermética. Solo aristas
              reconocidas iluminan el grafo; el resto espera coagulación HITL.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMode("clasico")}
            className="border border-[#FFB000]/30 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-400 hover:border-[#FFB000]/60 hover:text-[#FFB000]"
          >
            Vista clásica
          </button>
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch(query);
          }}
        >
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#FFB000]/50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Query → iluminar Quántomos y su órbita borgeana…"
              className="w-full border border-[#FFB000]/30 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-amber-50 placeholder:text-zinc-600 outline-none focus:border-[#FFB000]/70"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 border border-[#FFB000]/50 bg-zinc-950 px-4 py-2 text-xs uppercase tracking-wider text-[#FFB000] hover:bg-[#FFB000]/10 disabled:opacity-50"
          >
            {loading ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <SparklesIcon className="size-3.5" />
            )}
            Buscar
          </button>
        </form>
      </header>

      {!hasResults || !zone ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm text-[#FFB000]/80">Zona de Impacto en espera</p>
          <p className="max-w-md text-[11px] text-zinc-600">
            El motor vectoriza tu query con Cohere, localiza los 5 Quántomos
            más afines y viaja por KgEdge (reconocido · weight&gt;8).
          </p>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-[#FFB000]/20 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <section className="flex min-h-0 flex-col overflow-hidden">
            <PanelHeader
              label="CORE"
              hint="Match semántico directo"
              count={zone.core.length}
            />
            <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
              {zone.core.length === 0 ? (
                <EmptyLine text="Ningún Quántomo en el radio de impacto." />
              ) : (
                zone.core.map((hit) => <CoreCard key={hit.quantomoId} hit={hit} />)
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden">
            <PanelHeader
              label="ÓRBITA"
              hint="Conexiones borgeanas · gravedad alta"
              count={
                zone.orbit.confirmed.length + zone.orbit.suggested.length
              }
            />
            <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4">
              <div>
                <SubLabel text={`Confirmadas (weight > ${zone.meta.highGravityMin})`} />
                {zone.orbit.confirmed.length === 0 ? (
                  <EmptyLine text="Sin vecinos coagulados en órbita." />
                ) : (
                  <div className="mt-2 space-y-2">
                    {zone.orbit.confirmed.map((item) => (
                      <ConfirmedCard key={item.edgeId} item={item} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <SubLabel text="Sugeridas · HITL (opacidad 50%)" />
                {zone.orbit.suggested.length === 0 ? (
                  <EmptyLine text="Sin afinidades latentes sobre umbral." />
                ) : (
                  <div className="mt-2 space-y-2">
                    {zone.orbit.suggested.map((item) => (
                      <SuggestedCard
                        key={`${item.sourceQuantomoId}-${item.targetQuantomoId}`}
                        item={item}
                        busy={busyEdgeId === item.edgeId}
                        onCoagulate={handleCoagulate}
                        onReject={handleReject}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {zone ? (
        <footer className="shrink-0 border-t border-[#FFB000]/20 px-4 py-1.5 text-[10px] text-zinc-600">
          escaneados={zone.meta.quantomosScanned} · umbral=
          {zone.meta.semanticThreshold.toFixed(2)} · core=
          {zone.meta.coreLimit} · query=&quot;{zone.query}&quot;
        </footer>
      ) : null}
    </div>
  );
}

function PanelHeader({
  label,
  hint,
  count,
}: {
  label: string;
  hint: string;
  count: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-[#FFB000]/20 px-3 py-2">
      <div>
        <h2 className="text-xs tracking-[0.2em] text-[#FFB000]">{label}</h2>
        <p className="text-[10px] text-zinc-600">{hint}</p>
      </div>
      <span className="tabular-nums text-[10px] text-[#FFB000]/60">{count}</span>
    </div>
  );
}

function SubLabel({ text }: { text: string }) {
  return (
    <p className="text-[10px] uppercase tracking-wider text-zinc-500">{text}</p>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="mt-2 text-[11px] text-zinc-700">{text}</p>;
}

function CoreCard({ hit }: { hit: GraphRagCoreHit }) {
  return (
    <article className="border border-[#FFB000]/30 bg-zinc-950 p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm text-[#FFB000]">{hit.title}</h3>
        <span className="shrink-0 tabular-nums text-[10px] text-amber-200/70">
          {(hit.score * 100).toFixed(0)}%
        </span>
      </div>
      <p className="mt-1 line-clamp-4 text-[11px] leading-relaxed text-zinc-400">
        {hit.content}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        <Tag>{hit.universo}</Tag>
        {hit.tagsSemanticos.slice(0, 4).map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
    </article>
  );
}

function ConfirmedCard({ item }: { item: GraphRagOrbitConfirmed }) {
  return (
    <article className="border border-[#FFB000]/30 bg-zinc-950 p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm text-amber-100">
          {item.neighbor.title ?? item.neighbor.primaryName}
        </h3>
        <span className="shrink-0 border border-[#FFB000]/40 px-1.5 py-0.5 text-[10px] text-[#FFB000]">
          g={item.weight}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-zinc-500">
        {item.relationType} · {item.neighbor.type}
      </p>
      {item.neighbor.contentPreview ? (
        <p className="mt-1 line-clamp-3 text-[11px] text-zinc-400">
          {item.neighbor.contentPreview}
        </p>
      ) : null}
      <p className="mt-2 line-clamp-2 text-[10px] text-zinc-600">{item.context}</p>
    </article>
  );
}

function SuggestedCard({
  item,
  busy,
  onCoagulate,
  onReject,
}: {
  item: GraphRagOrbitSuggested;
  busy: boolean;
  onCoagulate: (edgeId: string) => void;
  onReject: (edgeId: string) => void;
}) {
  return (
    <article
      className={cn(
        "border border-[#FFB000]/20 bg-zinc-950 p-3 opacity-50",
      )}
      style={{ borderColor: `${AMBER}33` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm text-amber-100/90">{item.targetTitle}</h3>
          <p className="text-[10px] text-zinc-500">
            ← {item.sourceTitle} · sim={(item.similarity * 100).toFixed(0)}% ·
            peso propuesto={item.proposedWeight}
          </p>
        </div>
      </div>
      <p className="mt-1 line-clamp-3 text-[11px] text-zinc-400">
        {item.targetContentPreview}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy || !item.edgeId}
          onClick={() => item.edgeId && onCoagulate(item.edgeId)}
          className="border border-[#FFB000]/40 px-2 py-1 text-[10px] uppercase tracking-wider text-[#FFB000] hover:bg-[#FFB000]/10 disabled:opacity-40"
        >
          {busy ? "…" : "Coagular"}
        </button>
        <button
          type="button"
          disabled={busy || !item.edgeId}
          onClick={() => item.edgeId && onReject(item.edgeId)}
          className="border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 disabled:opacity-40"
        >
          Descartar
        </button>
      </div>
    </article>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="border border-[#FFB000]/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500">
      {children}
    </span>
  );
}
