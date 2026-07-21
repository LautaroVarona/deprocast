"use client";

import { useBabel } from "@/components/babel/babel-context";
import { PersonaFormSheet } from "@/components/personas/persona-form-sheet";
import { PersonaCard } from "@/components/personas/persona-card";
import { PersonaMergeSheet } from "@/components/personas/persona-merge-sheet";
import { PersonaRelationsSheet } from "@/components/personas/persona-relations-sheet";
import { PersonasCandidatesPanel } from "@/components/personas/personas-candidates-panel";
import { PersonasGraphWorkspace } from "@/components/personas/personas-graph-workspace";
import { PersonasTable } from "@/components/personas/personas-table";
import { Button } from "@/components/ui/button";
import type { Persona } from "@/lib/personas/model";
import type { PersonaCardDto } from "@/lib/personas/types";
import { personaSlugFromName } from "@/lib/personas/slug";
import { cn } from "@/lib/utils";
import {
  LayoutGridIcon,
  NetworkIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  TableIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type DashboardTab = "lista" | "candidatas" | "grafo";
type ListView = "cards" | "table";

function tabFromSearch(value: string | null): DashboardTab {
  if (value === "grafo") return "grafo";
  if (value === "candidatas" || value === "pending") return "candidatas";
  return "lista";
}

export function PersonasDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { universeSlug, universeFetch, isLoading: isUniverseLoading } = useBabel();
  const [tab, setTab] = useState<DashboardTab>(() =>
    tabFromSearch(searchParams.get("tab")),
  );
  const [listView, setListView] = useState<ListView>("table");
  const [personas, setPersonas] = useState<PersonaCardDto[]>([]);
  const [candidates, setCandidates] = useState<PersonaCardDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showRelations, setShowRelations] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [editPersona, setEditPersona] = useState<Persona | null>(null);
  const [mergeCandidate, setMergeCandidate] = useState<PersonaCardDto | null>(
    null,
  );
  const [linkPersona, setLinkPersona] = useState<{
    id: string;
    nombrePrincipal: string;
  } | null>(null);

  const loadPersonas = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await universeFetch("/api/personas?status=verified", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data: { personas: PersonaCardDto[] } = await response.json();
      setPersonas(data.personas);
    } catch {
      setPersonas([]);
    } finally {
      setIsLoading(false);
    }
  }, [universeFetch]);

  const loadCandidates = useCallback(async () => {
    setIsLoadingCandidates(true);
    try {
      const response = await universeFetch("/api/personas?status=pending", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data: { personas: PersonaCardDto[] } = await response.json();
      setCandidates(data.personas);
    } catch {
      setCandidates([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [universeFetch]);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadPersonas(), loadCandidates()]);
  }, [loadPersonas, loadCandidates]);

  useEffect(() => {
    setPersonas([]);
    setCandidates([]);
  }, [universeSlug]);

  useEffect(() => {
    setTab(tabFromSearch(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    if (isUniverseLoading) return;
    void reloadAll();
  }, [reloadAll, universeSlug, isUniverseLoading]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return personas;
    return personas.filter(
      (persona) =>
        persona.primaryName.toLowerCase().includes(q) ||
        persona.role?.toLowerCase().includes(q) ||
        persona.aliases.some((alias) => alias.toLowerCase().includes(q)),
    );
  }, [personas, query]);

  const stats = useMemo(() => {
    const withMentions = personas.filter((p) => p.mentionCount > 0).length;
    const withProjects = personas.filter((p) => p.projects.length > 0).length;
    return {
      total: personas.length,
      withMentions,
      withProjects,
      pending: candidates.length,
    };
  }, [personas, candidates]);

  const handleCreated = (persona: Persona) => {
    void reloadAll();
    router.push(`/personas/${personaSlugFromName(persona.nombrePrincipal)}`);
  };

  const openEdit = async (card: PersonaCardDto) => {
    try {
      const response = await fetch(`/api/personas/${encodeURIComponent(card.id)}`);
      const data = await response.json();
      if (response.ok && data.entity) {
        setEditPersona(data.entity as Persona);
        setShowForm(true);
      }
    } catch {
      // ignore
    }
  };

  const selectTab = (next: DashboardTab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "lista") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const qs = params.toString();
    router.replace(qs ? `/personas?${qs}` : "/personas");
  };

  const tabs: {
    id: DashboardTab;
    label: string;
    icon: typeof LayoutGridIcon;
    badge?: number;
  }[] = [
    { id: "lista", label: "Lista", icon: LayoutGridIcon },
    {
      id: "candidatas",
      label: "Candidatas",
      icon: SparklesIcon,
      badge: stats.pending > 0 ? stats.pending : undefined,
    },
    { id: "grafo", label: "Grafo", icon: NetworkIcon },
  ];

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
            <UsersRoundIcon className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Red Humana · Grafo de Personas
            </p>
            <h1 className="truncate text-sm font-semibold">
              Stakeholders e identidades de silicio
            </h1>
          </div>
        </div>
        <div className="hidden items-center gap-3 font-mono text-[10px] text-muted-foreground sm:flex">
          <span>{stats.total} verificadas</span>
          <span>{stats.pending} en revisión</span>
          <span>{stats.withMentions} con menciones</span>
          <span>{stats.withProjects} en proyectos activos</span>
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-1 border-b border-border px-4 sm:px-6">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
              tab === id
                ? id === "candidatas"
                  ? "border-amber-500 text-foreground"
                  : "border-emerald-500 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
            {typeof badge === "number" ? (
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] text-amber-700 dark:text-amber-400">
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "lista" && (
        <>
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2 sm:px-6">
            <div className="relative min-w-[200px] max-w-md flex-1">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, alias o rol…"
                className="w-full rounded-lg border border-input bg-background py-1.5 pr-3 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex gap-1 rounded-lg border border-border p-0.5">
              <button
                type="button"
                onClick={() => setListView("table")}
                className={cn(
                  "rounded-md px-2 py-1 text-xs",
                  listView === "table" ? "bg-muted" : "text-muted-foreground",
                )}
                aria-label="Vista tabla"
              >
                <TableIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setListView("cards")}
                className={cn(
                  "rounded-md px-2 py-1 text-xs",
                  listView === "cards" ? "bg-muted" : "text-muted-foreground",
                )}
                aria-label="Vista tarjetas"
              >
                <LayoutGridIcon className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center font-mono text-[10px] text-muted-foreground">
                Indexando identidades…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <p>
                  {query
                    ? "Ninguna persona coincide con la búsqueda."
                    : "Todavía no hay personas verificadas."}
                </p>
                {!query && stats.pending > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => selectTab("candidatas")}
                  >
                    Revisar {stats.pending} candidata
                    {stats.pending === 1 ? "" : "s"}
                  </Button>
                ) : null}
                {!query && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setEditPersona(null);
                      setShowForm(true);
                    }}
                  >
                    <PlusIcon />
                    Añadir la primera persona
                  </Button>
                )}
              </div>
            ) : listView === "table" ? (
              <PersonasTable
                personas={filtered}
                onLink={(persona) => {
                  setLinkPersona({
                    id: persona.id,
                    nombrePrincipal: persona.primaryName,
                  });
                  setShowRelations(true);
                }}
                onEdit={(persona) => void openEdit(persona)}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((persona) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    onLink={() => {
                      setLinkPersona({
                        id: persona.id,
                        nombrePrincipal: persona.primaryName,
                      });
                      setShowRelations(true);
                    }}
                    onEdit={() => void openEdit(persona)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "candidatas" && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <PersonasCandidatesPanel
            candidates={candidates}
            isLoading={isLoadingCandidates}
            onEdit={(persona) => void openEdit(persona)}
            onMerge={(persona) => {
              setMergeCandidate(persona);
              setShowMerge(true);
            }}
            onChanged={() => void reloadAll()}
          />
        </div>
      )}

      {tab === "grafo" && (
        <div className="min-h-0 flex-1">
          <PersonasGraphWorkspace />
        </div>
      )}

      {(tab === "lista" || tab === "candidatas") && (
        <Button
          type="button"
          size="lg"
          className={cn(
            "fixed right-6 bottom-6 z-40 shadow-lg shadow-emerald-500/20",
            "rounded-full px-5",
          )}
          onClick={() => {
            setEditPersona(null);
            setShowForm(true);
          }}
        >
          <PlusIcon />
          Añadir persona
        </Button>
      )}

      <PersonaFormSheet
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditPersona(null);
        }}
        mode={editPersona ? "edit" : "create"}
        initialPersona={editPersona}
        onSaved={(persona) => {
          if (editPersona) {
            void reloadAll();
          } else {
            handleCreated(persona);
          }
        }}
      />

      <PersonaRelationsSheet
        open={showRelations}
        source={linkPersona}
        onOpenChange={(open) => {
          setShowRelations(open);
          if (!open) setLinkPersona(null);
        }}
        onCreated={() => void reloadAll()}
      />

      <PersonaMergeSheet
        open={showMerge}
        candidate={mergeCandidate}
        onOpenChange={(open) => {
          setShowMerge(open);
          if (!open) setMergeCandidate(null);
        }}
        onMerged={() => void reloadAll()}
      />
    </div>
  );
}
