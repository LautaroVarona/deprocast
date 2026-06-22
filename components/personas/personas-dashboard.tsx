"use client";

import { AddPersonaSheet } from "@/components/personas/add-persona-sheet";
import { PersonaCard } from "@/components/personas/persona-card";
import { Button } from "@/components/ui/button";
import type { PersonaCardDto, PersonaDetailDto } from "@/lib/personas/types";
import { cn } from "@/lib/utils";
import {
  PlusIcon,
  SearchIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export function PersonasDashboard() {
  const router = useRouter();
  const [personas, setPersonas] = useState<PersonaCardDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const loadPersonas = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/personas", { cache: "no-store" });
      if (!response.ok) return;
      const data: { personas: PersonaCardDto[] } = await response.json();
      setPersonas(data.personas);
    } catch {
      setPersonas([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPersonas();
  }, [loadPersonas]);

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

  const handleCreated = (persona: PersonaDetailDto) => {
    void loadPersonas();
    router.push(`/personas/${persona.slug}`);
  };

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
            <UsersRoundIcon className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Red Humana · CRM de Contexto
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

      <div className="shrink-0 border-b border-border px-4 py-2 sm:px-6">
        <div className="relative max-w-md">
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
              <Button type="button" size="sm" onClick={() => setShowAdd(true)}>
                <PlusIcon />
                Añadir la primera persona
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((persona) => (
              <PersonaCard key={persona.id} persona={persona} />
            ))}
          </div>
        )}
      </div>

      <Button
        type="button"
        size="lg"
        className={cn(
          "fixed right-6 bottom-6 z-40 shadow-lg shadow-emerald-500/20",
          "rounded-full px-5",
        )}
        onClick={() => setShowAdd(true)}
      >
        <PlusIcon />
        Añadir persona
      </Button>

      <AddPersonaSheet
        open={showAdd}
        onOpenChange={setShowAdd}
        onCreated={handleCreated}
      />
    </div>
  );
}
