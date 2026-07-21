"use client";

import { AgentCard } from "@/components/agentes/agent-card";
import { AgentRow } from "@/components/agentes/agent-row";
import { IncubationLab } from "@/components/agentes/incubation-lab";
import { MetaMeteadorPanel } from "@/components/agentes/meta-meteador-panel";
import { SubprocessorsSection } from "@/components/agentes/subprocessors-section";
import { Button } from "@/components/ui/button";
import {
  CARTOGRAPHY_ECOSYSTEM_AGENT_IDS,
  ECOSYSTEM_STATS,
  MAGOS_AGENTS,
  OPERATIONAL_AGENTS,
  TEMPORAL_ECOSYSTEM_AGENT_IDS,
  type OperationalAgent,
} from "@/lib/agentes/catalog";
import { cn } from "@/lib/utils";
import {
  ActivityIcon,
  BotIcon,
  CalendarIcon,
  ClockIcon,
  CompassIcon,
  FileTextIcon,
  LayoutGridIcon,
  ListIcon,
  MapIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ViewMode = "cards" | "list";
type ToneFilter = "all" | OperationalAgent["badgeTone"];

export function AgentesWorkspace() {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [toneFilter, setToneFilter] = useState<ToneFilter>("all");
  const [activeAgentIds, setActiveAgentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void fetch("/api/historial/active-agents", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { agentIds?: string[] }) => {
        setActiveAgentIds(new Set(data.agentIds ?? []));
      })
      .catch(() => undefined);
  }, []);

  const temporalAgents = useMemo(() => {
    const ids = new Set<string>(TEMPORAL_ECOSYSTEM_AGENT_IDS);
    const query = searchQuery.trim().toLowerCase();
    return OPERATIONAL_AGENTS.filter((agent) => {
      if (!ids.has(agent.id)) return false;
      if (!query) return true;
      const haystack = [
        agent.name,
        agent.badge,
        ...agent.functions,
        ...agent.technologies,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [searchQuery]);

  const cartographyAgents = useMemo(() => {
    const ids = new Set<string>(CARTOGRAPHY_ECOSYSTEM_AGENT_IDS);
    const query = searchQuery.trim().toLowerCase();
    return OPERATIONAL_AGENTS.filter((agent) => {
      if (!ids.has(agent.id)) return false;
      if (!query) return true;
      const haystack = [
        agent.name,
        agent.badge,
        ...agent.functions,
        ...agent.technologies,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [searchQuery]);

  const filteredAgents = useMemo(() => {
    const temporalIds = new Set<string>(TEMPORAL_ECOSYSTEM_AGENT_IDS);
    const cartographyIds = new Set<string>(CARTOGRAPHY_ECOSYSTEM_AGENT_IDS);
    const query = searchQuery.trim().toLowerCase();
    return OPERATIONAL_AGENTS.filter((agent) => {
      if (temporalIds.has(agent.id) || cartographyIds.has(agent.id)) {
        return false;
      }
      if (toneFilter !== "all" && agent.badgeTone !== toneFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        agent.name,
        agent.badge,
        ...agent.functions,
        ...agent.technologies,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [searchQuery, toneFilter]);

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6">
        <header className="space-y-4 border-b border-border pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <BotIcon className="size-3.5" />
              Ecosistema cognitivo
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <FileTextIcon className="size-3.5" />
              Fuente: {ECOSYSTEM_STATS.docSource}
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Mapa de Agentes
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Monitor interactivo del exoesqueleto cognitivo local-first.
              Proveedor LLM unificado:{" "}
              <code className="rounded bg-card px-1.5 py-0.5 text-primary/90">
                {ECOSYSTEM_STATS.llmProvider}
              </code>{" "}
              vía{" "}
              <code className="rounded bg-card px-1.5 py-0.5 text-muted-foreground">
                lib/cohere/chat.ts
              </code>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatPill
              label="Operativos"
              value={ECOSYSTEM_STATS.operationalCount}
              tone="emerald"
            />
            <StatPill
              label="Subprocesadores"
              value={ECOSYSTEM_STATS.subprocessorsCount}
              tone="zinc"
            />
            <StatPill
              label="Fuentes KG"
              value={ECOSYSTEM_STATS.kgSourcesCount}
              tone="cyan"
            />
            <StatPill
              label="En diseño"
              value={ECOSYSTEM_STATS.designCount}
              tone="violet"
            />
          </div>
        </header>

        <section className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <ClockIcon className="size-4 text-primary/80" aria-hidden />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary/90">
              Eje temporal y calendario
            </h2>
            <span className="font-mono text-[10px] text-primary/70">
              SSOT · Ludus + /calendario
            </span>
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Agentes que gestionan eventos, tareas y planificación. Comparten la
            capa unificada{" "}
            <code className="rounded bg-card px-1 py-0.5 text-primary/80">
              lib/temporal
            </code>{" "}
            y se invalidan entre vistas con{" "}
            <code className="rounded bg-card px-1 py-0.5 text-primary/80">
              bumpTemporal()
            </code>
            .
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {temporalAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isActiveToday={activeAgentIds.has(agent.id)}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              ["/calendario", "Calendario"],
              ["/ludus/campamento", "Campamento"],
              ["/ludus/trinchera", "Trinchera"],
              ["/pendientes", "Pendientes"],
              ["/salud", "Salud"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] text-primary/90 hover:border-primary/40"
              >
                <CalendarIcon className="size-3" />
                {label}
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-accent/20 bg-accent/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <CompassIcon className="size-4 text-accent" aria-hidden />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-accent/90">
              Cartografía dual · Ludus
            </h2>
            <span className="font-mono text-[10px] text-accent/60">
              Plano mental + terreno real
            </span>
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Orientación en dos planos: el grafo semántico del Castillo (YO,
            personas, proyectos) y el mapa geográfico del Campamento (hitos
            permanentes + eventos temporales). SSOT en{" "}
            <code className="rounded bg-card px-1 py-0.5 text-accent">
              lib/geo
            </code>{" "}
            y{" "}
            <code className="rounded bg-card px-1 py-0.5 text-accent">
              lib/castillo/semantic-map
            </code>
            .
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cartographyAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isActiveToday={activeAgentIds.has(agent.id)}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              ["/ludus/castillo", "Castillo · Mapa"],
              ["/ludus/campamento", "Campamento · Mapa"],
              ["/ludus", "Ludus"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[11px] text-accent/90 hover:border-accent/40"
              >
                <MapIcon className="size-3" />
                {label}
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-accent/20 bg-accent/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <SparklesIcon className="size-4 text-accent" aria-hidden />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-accent/90">
              Magos
            </h2>
            <span className="font-mono text-[10px] text-accent/60">
              {ECOSYSTEM_STATS.magosCount} · matriz hermética
            </span>
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Agentes indexados sobre la matriz de 22 niveles (letra hebrea ↔
            tarot). Relacionan dimensiones reales de Deprocast con la estructura
            cabalística. SSOT en{" "}
            <code className="rounded bg-card px-1 py-0.5 text-accent">
              lib/mago/
            </code>
            .
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {MAGOS_AGENTS.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isActiveToday={activeAgentIds.has(agent.id)}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              ["/ludus/mago", "Mago 22"],
              ["/ludus/mago/3", "Mago 3"],
              ["/ludus/mago/7", "Mago 7"],
              ["/ludus/mago/12", "Mago 12"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[11px] text-accent/90 hover:border-accent/40"
              >
                <SparklesIcon className="size-3" />
                {label}
              </Link>
            ))}
            <Link
              href="/ludus/castillo"
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[11px] text-accent/90 hover:border-accent/40"
            >
              <MapIcon className="size-3" />
              Castillo
            </Link>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ActivityIcon className="size-4 text-primary/80" aria-hidden />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Agentes operativos
              </h2>
              <span className="font-mono text-[10px] text-muted-foreground">
                {filteredAgents.length}
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "h-8 gap-1.5 font-mono text-[10px] uppercase tracking-wider",
                  viewMode === "cards"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                <LayoutGridIcon className="size-3.5" />
                Cuadrícula
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setViewMode("list")}
                className={cn(
                  "h-8 gap-1.5 font-mono text-[10px] uppercase tracking-wider",
                  viewMode === "list"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                <ListIcon className="size-3.5" />
                Línea
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar agente, función o tecnología…"
                className="w-full rounded-lg border border-border bg-background/80 py-2 pl-10 pr-4 text-sm text-foreground outline-none focus:border-primary/40"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "Todos"],
                  ["cyan", "LLM"],
                  ["emerald", "Activo"],
                  ["rose", "HITL"],
                  ["zinc", "Det."],
                  ["violet", "Multimodal"],
                ] as const
              ).map(([tone, label]) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setToneFilter(tone)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition",
                    toneFilter === tone
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-border",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {viewMode === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isActiveToday={activeAgentIds.has(agent.id)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 w-10" />
                    <th className="px-3 py-2">Agente</th>
                    <th className="hidden px-3 py-2 md:table-cell">Tecnología</th>
                    <th className="hidden px-3 py-2 lg:table-cell">Funciones</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2 text-right">Rutas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((agent) => (
                    <AgentRow
                      key={agent.id}
                      agent={agent}
                      isActiveToday={activeAgentIds.has(agent.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <MetaMeteadorPanel />

        <SubprocessorsSection />

        <IncubationLab />

        <footer className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Rutas UI relacionadas:{" "}
          {[
            ["/chat", "Chat"],
            ["/ingesta", "Ingesta"],
            ["/validar", "Validar"],
            ["/grafo", "Grafo"],
            ["/calibrador", "Calibrador"],
            ["/diario", "Diario"],
            ["/pendientes", "Pendientes"],
            ["/enciclopedia", "Enciclopedia"],
            ["/ludus", "Ludus"],
            ["/calendario", "Calendario"],
            ["/salud", "Salud"],
            ["/historial", "Historial"],
            ["/molecular", "Molecular"],
          ].map(([href, label], index, arr) => (
            <span key={href}>
              <Link
                href={href}
                className="text-primary/70 hover:text-primary hover:underline"
              >
                {label}
              </Link>
              {index < arr.length - 1 ? " · " : null}
            </span>
          ))}
        </footer>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "cyan" | "violet" | "zinc";
}) {
  const tones = {
    emerald: "border-primary/30 bg-primary/5 text-primary",
    cyan: "border-primary/30 bg-primary/5 text-primary",
    violet: "border-primary/30 bg-primary/5 text-primary",
    zinc: "border-border bg-muted/40 text-muted-foreground",
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${tones[tone]}`}
    >
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-xs uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
}
