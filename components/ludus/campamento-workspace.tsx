"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import type { CampamentoSnapshot, ForgeCampamentoResponse } from "@/lib/ludus/types";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  BatteryMediumIcon,
  FlameIcon,
  HammerIcon,
  Loader2Icon,
  SparklesIcon,
  TentIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function CampamentoWorkspace() {
  const [snapshot, setSnapshot] = useState<CampamentoSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForging, setIsForging] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [isGolden, setIsGolden] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ludus/campamento", { cache: "no-store" });
      if (!response.ok) throw new Error("Error al cargar.");
      const data: CampamentoSnapshot = await response.json();
      setSnapshot(data);
      setProjectId((current) => current || data.projects[0]?.id || "");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar el Campamento.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleForge = async () => {
    if (!projectId || !title.trim() || isForging) return;
    setIsForging(true);
    try {
      const response = await fetch("/api/ludus/campamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, isGolden }),
      });
      const data = (await response.json()) as ForgeCampamentoResponse & {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Error al forjar.");
      setSnapshot(data.snapshot);
      setTitle("");
      setIsGolden(false);
      toast.success(
        isGolden ? "Prioridad Dorada forjada." : "Microtarea forjada.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al forjar.");
    } finally {
      setIsForging(false);
    }
  };

  const energy = snapshot?.energy;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Link
            href="/ludus/campamento"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowLeftIcon className="size-3.5" />
            Campamento
          </Link>
          <TentIcon className="size-5 text-primary/80" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary/60">
              Beta · Organización meso
            </p>
            <h1 className="text-2xl font-semibold text-foreground">Campamento</h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Traducí la estrategia del Castillo en táctica semanal. La barra de
          energía cruza telemetría de Salud con tu capacidad de asignar
          Prioridades Doradas.
        </p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2Icon className="size-6 animate-spin" />
        </div>
      ) : energy ? (
        <>
          <section className="castillo-card space-y-4 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <BatteryMediumIcon className="size-4 text-primary" />
                <h2 className="font-medium text-foreground">Abastecimiento</h2>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                Semana desde {energy.weekLabel}
              </span>
            </div>

            <div className="flex items-end justify-between">
              <p className="text-3xl font-semibold tabular-nums text-foreground">
                {energy.energyPercent}
                <span className="text-lg text-muted-foreground">%</span>
              </p>
              <div className="text-right font-mono text-[11px] text-muted-foreground">
                {energy.avgSleepHours !== null ? (
                  <p>Sueño prom: {energy.avgSleepHours}h</p>
                ) : (
                  <p>Sin datos de sueño</p>
                )}
                <p>
                  6:00 AM: {energy.wokeAt6Am ? "✓ logrado" : "— pendiente"}
                </p>
              </div>
            </div>

            <div className="relative h-3 overflow-hidden rounded-full bg-muted/40 ring-1 ring-border">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all",
                  energy.lowTelemetry
                    ? "from-destructive/80 to-destructive/60"
                    : "from-primary/80 via-primary/70 to-primary/80",
                )}
                style={{ width: `${energy.energyPercent}%` }}
              />
            </div>

            {energy.lowTelemetry ? (
              <p className="flex items-center gap-2 font-mono text-[11px] text-destructive/80">
                <FlameIcon className="size-3.5" />
                Telemetría base baja — máximo{" "}
                {energy.maxGoldenPrioritiesPerDay} Prioridad Dorada por día
              </p>
            ) : (
              <p className="font-mono text-[11px] text-muted-foreground">
                Hasta {energy.maxGoldenPrioritiesPerDay} Prioridades Doradas hoy ·{" "}
                {energy.goldenPrioritiesAssigned} asignadas
              </p>
            )}
          </section>

          <section className="castillo-card space-y-4 p-5">
            <div className="flex items-center gap-2">
              <HammerIcon className="size-4 text-accent" />
              <h2 className="font-medium text-foreground">Forjado de Tareas</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="font-mono text-[10px] uppercase text-muted-foreground">
                  Proyecto
                </span>
                <select
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-foreground"
                >
                  {snapshot?.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 sm:col-span-2">
                <span className="font-mono text-[10px] uppercase text-muted-foreground">
                  Micro-paso (≤15 min)
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ej: Revisar borrador del capítulo 3"
                  className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsGolden((value) => !value)}
                disabled={!energy.canAssignMoreGolden && !isGolden}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] transition-colors",
                  isGolden
                    ? "border-accent/50 bg-accent/20 text-accent"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/50",
                  !energy.canAssignMoreGolden &&
                    !isGolden &&
                    "cursor-not-allowed opacity-40",
                )}
              >
                <SparklesIcon className="size-3.5" />
                Prioridad Dorada
              </button>

              <Button
                type="button"
                size="sm"
                disabled={isForging || !title.trim()}
                className="bg-primary/80 text-foreground hover:bg-primary"
                onClick={() => void handleForge()}
              >
                {isForging ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <HammerIcon className="size-4" />
                )}
                Forjar
              </Button>

              <Link
                href="/ludus/trinchera"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "ml-auto border-destructive/30 text-destructive hover:bg-destructive/10",
                )}
              >
                Ir a la Trinchera →
              </Link>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Cola forjada ({snapshot?.microtasks.length ?? 0})
            </h2>
            {snapshot?.microtasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Forjá microtareas para enviarlas al búnker.
              </p>
            ) : (
              <ul className="grid gap-2">
                {snapshot?.microtasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm text-foreground">{task.title}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {task.projectTitle} · {task.estimatedMin} min · peso{" "}
                        {task.baseWeight}
                        {task.baseWeight >= 8 ? " ★" : ""}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {task.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
