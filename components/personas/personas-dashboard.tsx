"use client";

import { useBabel } from "@/components/babel/babel-context";
import { PersonaFormSheet } from "@/components/personas/persona-form-sheet";
import { PersonaCard } from "@/components/personas/persona-card";
import { PersonaRelationsSheet } from "@/components/personas/persona-relations-sheet";
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
  TableIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type DashboardTab = "lista" | "grafo";
type ListView = "cards" | "table";

export function PersonasDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { universeSlug, universeFetch, isLoading: isUniverseLoading } = useBabel();
  const initialTab = searchParams.get("tab") === "grafo" ? "grafo" : "lista";
  const [tab, setTab] = useState<DashboardTab>(initialTab);
  const [listView, setListView] = useState<ListView>("table");
  const [personas, setPersonas] = useState<PersonaCardDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showRelations, setShowRelations] = useState(false);
  const [editPersona, setEditPersona] = useState<Persona | null>(null);
  const [linkPersona, setLinkPersona] = useState<{
    id: string;
    nombrePrincipal: string;
  } | null>(null);

  const loadPersonas = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await universeFetch("/api/personas", { cache: "no-store" });
      if (!response.ok) return;
      const data: { personas: PersonaCardDto[] } = await response.json();
      setPersonas(data.personas);
    } catch {
      setPersonas([]);
    } finally {
      setIsLoading(false);
    }
  }, [universeFetch]);

  useEffect(() => {
    setPersonas([]);
  }, [universeSlug]);

  useEffect(() => {
    setTab(searchParams.get("tab") === "grafo" ? "grafo" : "lista");
  }, [searchParams]);

  useEffect(() => {
    if (isUniverseLoading) return;
    void loadPersonas();
  }, [loadPersonas, universeSlug, isUniverseLoading]);

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
    return { total: personas.length, withMentions, withProjects };
  }, [personas]);

  const handleCreated = (persona: Persona) => {
    void loadPersonas();
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

  const tabs: { id: DashboardTab; label: string; icon: typeof LayoutGridIcon }[] =
    [
      { id: "lista", label: "Lista", icon: LayoutGridIcon },
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
          <span>{stats.total} personas</span>
          <span>{stats.withMentions} con menciones</span>
          <span>{stats.withProjects} en proyectos activos</span>
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-1 border-b border-border px-4 sm:px-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
              tab === id
                ? "border-emerald-500 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "lista" && (
        <>
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2 sm:px-6">
            <div className="relative min-w-[200px] flex-1 max-w-md">
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
                    : "Todavía no hay personas indexadas."}
                </p>
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

      {tab === "grafo" && (
        <div className="min-h-0 flex-1">
          <PersonasGraphWorkspace />
        </div>
      )}

      {tab === "lista" && (
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
            void loadPersonas();
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
        onCreated={() => void loadPersonas()}
      />
    </div>
  );
}
