"use client";

import { useBabel } from "@/components/babel/babel-context";
import { QuantomoEnergyCard } from "@/components/pendientes/quantomo-energy-card";
import { TaskCalibratorPanel } from "@/components/pendientes/task-calibrator-panel";
import { Button } from "@/components/ui/button";
import { BLOQUE_PRIORIDADES } from "@/lib/jornada/types";
import type { PendingTaskDto } from "@/lib/pendientes/types";
import type { DayOffset } from "@/lib/pendientes/types";
import { cn } from "@/lib/utils";
import {
  ListTodoIcon,
  Loader2Icon,
  PlusIcon,
  ScaleIcon,
  SparklesIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type TabId = "suggested" | "manual" | "calibrator";

const TABS: { id: TabId; label: string; icon: typeof SparklesIcon }[] = [
  { id: "suggested", label: "Sugeridas", icon: SparklesIcon },
  { id: "manual", label: "Manual", icon: PlusIcon },
  { id: "calibrator", label: "Calibrador", icon: ScaleIcon },
];

export function PendientesWorkspace() {
  const {
    universeSlug,
    universeFetch,
    isLoading: isUniverseLoading,
    bumpTemporal,
  } = useBabel();
  const [tab, setTab] = useState<TabId>("suggested");
  const [suggested, setSuggested] = useState<PendingTaskDto[]>([]);
  const [calibrationQueue, setCalibrationQueue] = useState<PendingTaskDto[]>([]);
  const [activeCalibration, setActiveCalibration] =
    useState<PendingTaskDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [manualTitle, setManualTitle] = useState("");
  const [manualDay, setManualDay] = useState<DayOffset>("today");
  const [manualBloque, setManualBloque] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const loadSuggested = useCallback(async () => {
    const response = await universeFetch("/api/pendientes?status=suggested", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Error al cargar sugerencias.");
    const data = await response.json();
    setSuggested(data.tasks ?? []);
  }, [universeFetch]);

  const loadCalibration = useCallback(async () => {
    const response = await universeFetch(
      "/api/pendientes?status=recognized,calibrated",
      {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Error al cargar cola.");
    const data = await response.json();
    const queue = (data.tasks ?? []).filter(
      (t: PendingTaskDto) =>
        t.status === "recognized" || t.status === "calibrated",
    );
    setCalibrationQueue(queue);
    setActiveCalibration((current) => current ?? queue[0] ?? null);
  }, [universeFetch]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadSuggested(), loadCalibration()]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al cargar pendientes.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadSuggested, loadCalibration]);

  useEffect(() => {
    setSuggested([]);
    setCalibrationQueue([]);
    setActiveCalibration(null);
  }, [universeSlug]);

  useEffect(() => {
    if (isUniverseLoading) return;
    void load();
  }, [load, universeSlug, isUniverseLoading]);

  const handleAction = async (
    id: string,
    action: "recognize" | "reject",
    andCalibrate = false,
  ) => {
    const response = await universeFetch(`/api/pendientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Error al actualizar.");
    }
    bumpTemporal();
    if (andCalibrate && action === "recognize") {
      setActiveCalibration(data.task);
    }
    return data.task as PendingTaskDto;
  };

  const handleCrystallize = async (id: string, weight: number) => {
    try {
      await handleAction(id, "recognize", true);
      const calibrateRes = await universeFetch(`/api/pendientes/${id}/calibrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight }),
      });
      const calibrateData = await calibrateRes.json();
      if (!calibrateRes.ok) {
        throw new Error(calibrateData.error ?? "Error al calibrar.");
      }
      bumpTemporal();
      // Delay list refresh so the crystallize flash can play
      window.setTimeout(() => {
        void load();
      }, 1400);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo cristalizar.",
      );
      throw error;
    }
  };

  const handleRejectSuggested = async (id: string) => {
    try {
      await handleAction(id, "reject");
      window.setTimeout(() => {
        void load();
      }, 1400);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo rechazar.",
      );
      throw error;
    }
  };

  const handleManualCreate = async () => {
    const title = manualTitle.trim();
    if (!title) {
      toast.error("Escribí un título.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await universeFetch("/api/pendientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          targetDay: manualDay,
          bloque: manualBloque || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Error al crear.");
      }
      toast.success("Pendiente creada");
      setManualTitle("");
      setActiveCalibration(data.task);
      bumpTemporal();
      await load();
      setTab("calibrator");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ListTodoIcon className="size-5 text-accent" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              El Validador · Tareas
            </p>
            <h1 className="text-lg font-semibold">Lista de Pendientes</h1>
          </div>
        </div>
      </header>

      <div className="flex shrink-0 gap-1 border-b border-border px-3 py-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors",
              tab === id
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : tab === "suggested" ? (
          <div className="grid h-full auto-rows-min gap-3 overflow-y-auto sm:grid-cols-2">
            {suggested.length === 0 ? (
              <p className="col-span-full text-sm text-muted-foreground">
                Sin asaltos sugeridos. El Quantador y el Listador extraerán acciones de ingesta y diario.
              </p>
            ) : (
              suggested.map((task) => (
                <QuantomoEnergyCard
                  key={task.id}
                  task={task}
                  onCrystallize={handleCrystallize}
                  onReject={handleRejectSuggested}
                />
              ))
            )}
          </div>
        ) : tab === "manual" ? (
          <div className="mx-auto flex max-w-md flex-col gap-4">
            <label className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Título
              </span>
              <input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Qué hay que hacer…"
              />
            </label>
            <label className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Día
              </span>
              <select
                value={manualDay}
                onChange={(e) => setManualDay(e.target.value as DayOffset)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="yesterday">Ayer</option>
                <option value="today">Hoy</option>
                <option value="tomorrow">Mañana</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Bloque (opcional)
              </span>
              <select
                value={manualBloque}
                onChange={(e) => setManualBloque(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {BLOQUE_PRIORIDADES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={() => void handleManualCreate()} disabled={isSaving}>
              {isSaving ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <PlusIcon className="size-4" />
              )}
              Crear pendiente
            </Button>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden md:flex-row">
            <ul className="flex shrink-0 gap-2 overflow-x-auto md:w-48 md:flex-col md:overflow-y-auto">
              {calibrationQueue.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => setActiveCalibration(task)}
                    className={cn(
                      "w-full rounded-md border px-2 py-2 text-left text-xs transition-colors",
                      activeCalibration?.id === task.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <span className="line-clamp-2">{task.title}</span>
                    {task.weight !== null ? (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        Peso {task.weight}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {activeCalibration ? (
                <TaskCalibratorPanel
                  key={activeCalibration.id}
                  task={activeCalibration}
                  onCalibrated={async () => {
                    bumpTemporal();
                    await load();
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Reconocé tareas para calibrarlas aquí.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
