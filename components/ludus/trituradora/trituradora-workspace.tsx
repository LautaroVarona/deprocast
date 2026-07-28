"use client";

import { useBabel } from "@/components/babel/babel-context";
import { LudusHeader } from "@/components/ludus/ludus-header";
import { buttonVariants } from "@/components/ui/button";
import type { TaskBreakerMicrotask } from "@/lib/ludus/types";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  CogIcon,
  FlameIcon,
  Loader2Icon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ProjectOption = {
  id: string;
  title: string;
  campo: string;
  estado: string;
};

type PersonaOption = {
  id: string;
  primaryName: string;
};

type MissionCard = TaskBreakerMicrotask & {
  dismissed: boolean;
  coagulated: boolean;
  coagulating: boolean;
};

const AMBER = "#FFB000";

export function TrituradoraWorkspace() {
  const { universeFetch, bumpTemporal } = useBabel();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [personas, setPersonas] = useState<PersonaOption[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [contextString, setContextString] = useState("");
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isCrushing, setIsCrushing] = useState(false);
  const [isCoagulatingAll, setIsCoagulatingAll] = useState(false);
  const [crushPhase, setCrushPhase] = useState(0);
  const [cards, setCards] = useState<MissionCard[]>([]);
  const [lastSource, setLastSource] = useState<"llm" | "fallback" | null>(null);

  const loadCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      const [projectsRes, personasRes] = await Promise.all([
        universeFetch("/api/proyectos", { cache: "no-store" }),
        universeFetch("/api/personas?status=verified", { cache: "no-store" }),
      ]);

      if (projectsRes.ok) {
        const data = (await projectsRes.json()) as {
          projects?: Array<{
            id: string;
            title: string;
            campo: string;
            estado: string;
          }>;
        };
        setProjects(
          (data.projects ?? [])
            .filter((p) => p.estado !== "Descartado")
            .map((p) => ({
              id: p.id,
              title: p.title,
              campo: p.campo,
              estado: p.estado,
            })),
        );
      }

      if (personasRes.ok) {
        const data = (await personasRes.json()) as {
          personas?: Array<{ id: string; primaryName: string }>;
        };
        setPersonas(
          (data.personas ?? []).map((p) => ({
            id: p.id,
            primaryName: p.primaryName,
          })),
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar el catálogo de ingesta.");
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [universeFetch]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!isCrushing) {
      setCrushPhase(0);
      return;
    }
    const timer = window.setInterval(() => {
      setCrushPhase((phase) => (phase + 1) % 4);
    }, 420);
    return () => window.clearInterval(timer);
  }, [isCrushing]);

  const primaryProjectId = selectedProjectIds[0] ?? null;

  const pendingCards = useMemo(
    () => cards.filter((card) => !card.dismissed && !card.coagulated),
    [cards],
  );

  const toggleProject = (id: string) => {
    setSelectedProjectIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const togglePersona = (id: string) => {
    setSelectedPersonaIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const handleCrush = async () => {
    if (isCrushing) return;
    if (
      !contextString.trim() &&
      selectedProjectIds.length === 0 &&
      selectedPersonaIds.length === 0
    ) {
      toast.error("Ingresá un Boss: texto, proyecto o persona.");
      return;
    }

    setIsCrushing(true);
    try {
      const entities = [
        ...selectedPersonaIds.map((id) => {
          const persona = personas.find((item) => item.id === id);
          return {
            id,
            kind: "persona" as const,
            label: persona?.primaryName ?? id,
          };
        }),
        ...selectedProjectIds.slice(1).map((id) => {
          const project = projects.find((item) => item.id === id);
          return {
            id,
            kind: "contexto" as const,
            label: project?.title ?? id,
          };
        }),
      ];

      const response = await universeFetch("/api/ludus/task-breaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: primaryProjectId,
          entities,
          contextString,
        }),
      });

      const data = (await response.json()) as {
        microtasks?: TaskBreakerMicrotask[];
        source?: "llm" | "fallback";
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Fallo de trituradora.");
      }

      const nextCards = (data.microtasks ?? []).map((task) => ({
        ...task,
        dismissed: false,
        coagulated: false,
        coagulating: false,
      }));

      setCards(nextCards);
      setLastSource(data.source ?? "llm");
      toast.success(
        `${nextCards.length} microtareas forjadas. Revisá y coagulá (HITL).`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo triturar.",
      );
    } finally {
      setIsCrushing(false);
    }
  };

  const coagulateOne = async (localId: string) => {
    const card = cards.find((item) => item.localId === localId);
    if (!card || card.coagulated || card.dismissed) return;

    setCards((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, coagulating: true } : item,
      ),
    );

    try {
      const response = await universeFetch(
        "/api/ludus/task-breaker/coagulate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            microtasks: [
              {
                title: card.title,
                description: card.description,
                estimatedMinutes: card.estimatedMinutes,
                gravityWeight: card.gravityWeight,
                projectId: card.projectId,
              },
            ],
          }),
        },
      );

      const data = (await response.json()) as {
        created?: number;
        skipped?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo coagular.");
      }

      setCards((current) =>
        current.map((item) =>
          item.localId === localId
            ? { ...item, coagulated: true, coagulating: false }
            : item,
        ),
      );
      bumpTemporal();
      toast.success(
        data.skipped
          ? "Duplicado omitido — ya estaba en la Trinchera."
          : "Enviado a la Trinchera.",
      );
    } catch (error) {
      setCards((current) =>
        current.map((item) =>
          item.localId === localId ? { ...item, coagulating: false } : item,
        ),
      );
      toast.error(
        error instanceof Error ? error.message : "Error al coagular.",
      );
    }
  };

  const coagulateAll = async () => {
    if (!pendingCards.length || isCoagulatingAll) return;
    setIsCoagulatingAll(true);

    try {
      const response = await universeFetch(
        "/api/ludus/task-breaker/coagulate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            microtasks: pendingCards.map((card) => ({
              title: card.title,
              description: card.description,
              estimatedMinutes: card.estimatedMinutes,
              gravityWeight: card.gravityWeight,
              projectId: card.projectId,
            })),
          }),
        },
      );

      const data = (await response.json()) as {
        created?: number;
        skipped?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo coagular el lote.");
      }

      const pendingIds = new Set(pendingCards.map((card) => card.localId));
      setCards((current) =>
        current.map((item) =>
          pendingIds.has(item.localId)
            ? { ...item, coagulated: true, coagulating: false }
            : item,
        ),
      );
      bumpTemporal();
      toast.success(
        `Coaguladas ${data.created ?? 0}` +
          (data.skipped ? ` · omitidas ${data.skipped}` : ""),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al coagular todo.",
      );
    } finally {
      setIsCoagulatingAll(false);
    }
  };

  const dismissCard = (localId: string) => {
    setCards((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, dismissed: true } : item,
      ),
    );
  };

  const crushLabel = [
    "INGESTA…",
    "FRAGMENTANDO…",
    "CALIBRANDO…",
    "FORJANDO…",
  ][crushPhase];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <LudusHeader />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, #FFB000 2px, #FFB000 3px), repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,176,0,0.35) 14px, rgba(255,176,0,0.35) 15px)",
            backgroundSize: "100% 48px, 48px 100%",
          }}
        />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
          <header className="space-y-3 border-b border-[#FFB000]/25 pb-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.32em]"
                  style={{ color: AMBER }}
                >
                  Orquestador · Alquimista · HITL
                </p>
                <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
                  TASK-BREAKER
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                  Arrojá un Boss a la Trituradora. El LLM solo propone;
                  vos coagulás. Nada entra a SQLite sin tu click.
                </p>
              </div>
              <Link
                href="/ludus/trinchera"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-[#FFB000]/40 bg-transparent font-mono text-[10px] uppercase tracking-wider text-[#FFB000] hover:bg-[#FFB000]/10 hover:text-[#FFB000]",
                )}
              >
                Ir a Trinchera
              </Link>
            </div>
            <p className="font-mono text-[10px] text-zinc-500">
              Regla de oro: 15–40 min · óptimo 15–25 · gravedad 1–12
              {lastSource ? ` · fuente: ${lastSource}` : ""}
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Zona de Ingesta */}
            <section className="space-y-4 rounded-sm border border-[#FFB000]/30 bg-zinc-950/90 p-4 shadow-[0_0_40px_-20px_rgba(255,176,0,0.45)] sm:p-5">
              <div className="flex items-center gap-2">
                <CogIcon className="size-4" style={{ color: AMBER }} />
                <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-[#FFB000]">
                  Zona de Ingesta
                </h2>
              </div>

              <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Objetivo narrativo / Boss
                </span>
                <textarea
                  value={contextString}
                  onChange={(event) => setContextString(event.target.value)}
                  rows={5}
                  placeholder="Ej: Validar 1.916 matrículas MASC sin paralizarme…"
                  className="w-full resize-y rounded-sm border border-zinc-800 bg-zinc-900/80 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-[#FFB000]/60 focus:outline-none focus:ring-1 focus:ring-[#FFB000]/40"
                />
              </label>

              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Proyectos (Bosses)
                </span>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-sm border border-zinc-800 bg-zinc-900/50 p-2">
                  {isLoadingCatalog ? (
                    <p className="px-1 py-2 font-mono text-xs text-zinc-500">
                      Cargando proyectos…
                    </p>
                  ) : projects.length === 0 ? (
                    <p className="px-1 py-2 font-mono text-xs text-zinc-500">
                      Sin proyectos en el Atanor.
                    </p>
                  ) : (
                    projects.map((project) => {
                      const active = selectedProjectIds.includes(project.id);
                      return (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => toggleProject(project.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left font-mono text-xs transition-colors",
                            active
                              ? "bg-[#FFB000]/15 text-[#FFB000]"
                              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
                          )}
                        >
                          <span className="truncate">{project.title}</span>
                          <span className="shrink-0 text-[10px] opacity-70">
                            {project.campo}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                {selectedProjectIds.length > 1 ? (
                  <p className="font-mono text-[10px] text-zinc-500">
                    Primer proyecto seleccionado = vínculo SQLite. Los demás
                    entran como contexto.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Personas / entidades
                </span>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-sm border border-zinc-800 bg-zinc-900/50 p-2">
                  {isLoadingCatalog ? (
                    <p className="px-1 py-2 font-mono text-xs text-zinc-500">
                      Cargando personas…
                    </p>
                  ) : personas.length === 0 ? (
                    <p className="px-1 py-2 font-mono text-xs text-zinc-500">
                      Sin personas verificadas.
                    </p>
                  ) : (
                    personas.map((persona) => {
                      const active = selectedPersonaIds.includes(persona.id);
                      return (
                        <button
                          key={persona.id}
                          type="button"
                          onClick={() => togglePersona(persona.id)}
                          className={cn(
                            "flex w-full items-center rounded-sm px-2 py-1.5 text-left font-mono text-xs transition-colors",
                            active
                              ? "bg-[#FFB000]/15 text-[#FFB000]"
                              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
                          )}
                        >
                          {persona.primaryName}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleCrush()}
                disabled={isCrushing}
                className={cn(
                  "group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-sm border-2 py-5 font-mono text-lg font-bold uppercase tracking-[0.2em] transition-all",
                  "border-[#FFB000] bg-[#FFB000]/10 text-[#FFB000]",
                  "hover:bg-[#FFB000]/20 hover:shadow-[0_0_30px_-8px_rgba(255,176,0,0.7)]",
                  "disabled:cursor-wait disabled:opacity-80",
                )}
              >
                {isCrushing ? (
                  <>
                    <Loader2Icon className="size-5 animate-spin" />
                    {crushLabel}
                  </>
                ) : (
                  <>
                    <FlameIcon className="size-5" />
                    Triturar
                  </>
                )}
                {isCrushing ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-[#FFB000]"
                  />
                ) : null}
              </button>
            </section>

            {/* Zona de Resultados */}
            <section className="space-y-4 rounded-sm border border-zinc-800 bg-zinc-950/90 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FlameIcon className="size-4 text-[#FFB000]" />
                  <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-300">
                    Cartas de Misión
                  </h2>
                  <span className="font-mono text-[10px] text-zinc-600">
                    {pendingCards.length} pendientes
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void coagulateAll()}
                  disabled={!pendingCards.length || isCoagulatingAll}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                    pendingCards.length
                      ? "border-[#FFB000]/50 text-[#FFB000] hover:bg-[#FFB000]/10"
                      : "border-zinc-800 text-zinc-600",
                  )}
                >
                  {isCoagulatingAll ? (
                    <Loader2Icon className="size-3 animate-spin" />
                  ) : (
                    <CheckIcon className="size-3" />
                  )}
                  Coagular Todo
                </button>
              </div>

              {cards.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-2 border border-dashed border-zinc-800 bg-zinc-900/30 px-4 py-10 text-center">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-600">
                    Salida vacía
                  </p>
                  <p className="max-w-sm text-sm text-zinc-500">
                    Tras triturar, las microtareas aparecen aquí como píldoras.
                    Solo se oficializan al coagular.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {cards.map((card) => {
                    if (card.dismissed) return null;
                    return (
                      <li
                        key={card.localId}
                        className={cn(
                          "rounded-sm border p-3 transition-opacity",
                          card.coagulated
                            ? "border-emerald-500/30 bg-emerald-950/20 opacity-60"
                            : "border-[#FFB000]/25 bg-zinc-900/70",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[10px] text-[#FFB000]/80">
                                #{String(card.sequence).padStart(2, "0")}
                              </span>
                              <span className="font-mono text-[10px] text-zinc-500">
                                {card.estimatedMinutes} min
                              </span>
                              <span className="font-mono text-[10px] text-zinc-500">
                                g={card.gravityWeight}
                              </span>
                              {card.coagulated ? (
                                <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                                  En Trinchera
                                </span>
                              ) : null}
                            </div>
                            <h3 className="text-sm font-medium text-zinc-100">
                              {card.title}
                            </h3>
                            {card.description ? (
                              <p className="text-xs leading-relaxed text-zinc-400">
                                {card.description}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {!card.coagulated ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void coagulateOne(card.localId)}
                              disabled={card.coagulating}
                              className="inline-flex items-center gap-1.5 rounded-sm border border-[#FFB000]/50 bg-[#FFB000]/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#FFB000] hover:bg-[#FFB000]/20 disabled:opacity-60"
                            >
                              {card.coagulating ? (
                                <Loader2Icon className="size-3 animate-spin" />
                              ) : (
                                <CheckIcon className="size-3" />
                              )}
                              Enviar a la Trinchera
                            </button>
                            <button
                              type="button"
                              onClick={() => dismissCard(card.localId)}
                              className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-700 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
                            >
                              <Trash2Icon className="size-3" />
                              Descartar
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1 font-mono text-[10px] text-emerald-500/80">
                            <XIcon className="size-3 opacity-0" />
                            Persistido en SQLite · reconocido
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
