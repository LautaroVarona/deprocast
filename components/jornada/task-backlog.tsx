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
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-white/40">
        <span>{label}</span>
        <span className="tabular-nums text-white/70">{value}/12</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            tone === "valor"
              ? "bg-gradient-to-r from-amber-500/70 to-amber-200"
              : "bg-gradient-to-r from-rose-500/70 to-orange-200",
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
      <div className="jornada-noir-glow pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-amber-500/10 blur-3xl" />

      <header className="relative flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <SparklesIcon className="size-4 text-amber-300/90" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
            La Acción / Partícula
          </p>
          <h2 className="text-sm font-medium text-white">
            3 Prioridades Doradas
          </h2>
        </div>
      </header>

      <div className="relative space-y-3 p-4">
        {goldenTasks.length === 0 ? (
          <p className="font-mono text-sm text-white/50">
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
                  "jornada-task-card group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4 transition-all duration-300",
                  isAligned && !isDone && `ring-1 ring-white/20 ${BLOQUE_GLOW[task.ejeX]}`,
                  isDone && "opacity-50",
                  !isDone && "hover:-translate-y-0.5 hover:border-white/20",
                )}
              >
                <div className="jornada-idle-shimmer pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-white/35">
                        #{index + 1}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-white/15 bg-white/5 font-mono text-[10px]",
                          BLOQUE_COLORS[task.ejeX],
                        )}
                      >
                        Eje X · {task.ejeX}
                      </Badge>
                      {isAligned && !isDone && (
                        <Badge className="border-emerald-400/30 bg-emerald-500/15 font-mono text-[10px] text-emerald-200">
                          Sincronizado
                        </Badge>
                      )}
                    </div>
                    <h3
                      className={cn(
                        "text-sm font-medium text-white",
                        isDone && "line-through",
                      )}
                    >
                      {task.nombre}
                    </h3>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                      Yield
                    </p>
                    <p className="font-mono text-lg tabular-nums text-amber-200">
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
                        ? "bg-white/10 text-white/50"
                        : "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30",
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

        <p className="font-mono text-[10px] text-white/30">
          Backlog total: {state.tasks.filter((t) => !t.completada).length} tareas
          en espera · solo 3 visibles por diseño
        </p>
      </div>
    </section>
  );
}
