"use client";

import { useJornada } from "@/components/jornada/jornada-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BLOQUE_COLORS,
  BLOQUE_GLOW,
} from "@/lib/jornada/constants";
import { computeTaskCurrency } from "@/lib/jornada/utils";
import { cn } from "@/lib/utils";
import { CheckIcon, SparklesIcon, ZapIcon } from "lucide-react";

function AxisBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "valor" | "friccion";
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}/12</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            tone === "valor"
              ? "bg-gradient-to-r from-accent/70 to-accent/20"
              : "bg-gradient-to-r from-destructive/70 to-accent/20",
          )}
          style={{ width: `${(value / 12) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function TaskBacklog() {
  const { goldenTasks, activeBloque, completeTask, touch, state } = useJornada();

  return (
    <section
      className="jornada-noir-panel relative overflow-hidden"
      aria-label="Prioridades doradas"
    >
      <div className="jornada-noir-glow pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-accent/10 blur-3xl" />

      <header className="relative flex items-center gap-2 border-b border-border px-4 py-3">
        <SparklesIcon className="size-4 text-accent/90" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            La Acción / Partícula
          </p>
          <h2 className="text-sm font-medium text-foreground">
            3 Prioridades Doradas
          </h2>
        </div>
      </header>

      <div className="relative space-y-3 p-4">
        {goldenTasks.length === 0 ? (
          <p className="font-mono text-sm text-muted-foreground">
            [Sistema] Todas las prioridades doradas completadas. Jornada sellada.
          </p>
        ) : (
          goldenTasks.map((task, index) => {
            const currency = computeTaskCurrency(task.ejeY, task.ejeZ);
            const isAligned = activeBloque === task.ejeX;
            const isDone = task.completada;

            return (
              <article
                key={task.id}
                className={cn(
                  "jornada-task-card group relative overflow-hidden rounded-xl border border-border bg-card/80 p-4 transition-all duration-300",
                  isAligned && !isDone && `ring-1 ring-border ${BLOQUE_GLOW[task.ejeX]}`,
                  isDone && "opacity-50",
                  !isDone && "hover:-translate-y-0.5 hover:border-border",
                )}
              >
                <div className="jornada-idle-shimmer pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        #{index + 1}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-border bg-muted/40 font-mono text-[10px]",
                          BLOQUE_COLORS[task.ejeX],
                        )}
                      >
                        Eje X · {task.ejeX}
                      </Badge>
                      {isAligned && !isDone && (
                        <Badge className="border-primary/30 bg-primary/15 font-mono text-[10px] text-primary">
                          Sincronizado
                        </Badge>
                      )}
                    </div>
                    <h3
                      className={cn(
                        "text-sm font-medium text-foreground",
                        isDone && "line-through",
                      )}
                    >
                      {task.nombre}
                    </h3>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Yield
                    </p>
                    <p className="font-mono text-lg tabular-nums text-accent">
                      {currency}
                    </p>
                  </div>
                </div>

                <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
                  <AxisBar label="Eje Y · Valor" value={task.ejeY} tone="valor" />
                  <AxisBar label="Eje Z · Fricción" value={task.ejeZ} tone="friccion" />
                </div>

                <div className="relative mt-4 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isDone}
                    className={cn(
                      "font-mono text-xs",
                      isDone
                        ? "bg-muted/40 text-muted-foreground"
                        : "bg-primary/20 text-primary hover:bg-primary/30",
                    )}
                    onClick={() => {
                      touch();
                      completeTask(task.id);
                    }}
                  >
                    {isDone ? (
                      <>
                        <CheckIcon className="size-3.5" />
                        Completada
                      </>
                    ) : (
                      <>
                        <ZapIcon className="size-3.5" />
                        Ejecutar Partícula
                      </>
                    )}
                  </Button>
                </div>
              </article>
            );
          })
        )}

        <p className="font-mono text-[10px] text-muted-foreground">
          Backlog total: {state.tasks.filter((t) => !t.completada).length} tareas
          en espera · solo 3 visibles por diseño
        </p>
      </div>
    </section>
  );
}
