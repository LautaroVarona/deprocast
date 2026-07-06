"use client";

import { Button } from "@/components/ui/button";
import type {
  LudusCalibrationProject,
  LudusCalibrationSnapshot,
  LudusProjectStatus,
} from "@/lib/ludus/types";
import { cn } from "@/lib/utils";
import {
  ArchiveIcon,
  CloudFogIcon,
  Loader2Icon,
  PauseIcon,
  SparklesIcon,
  SwordsIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const STATUS_LABELS: Record<LudusProjectStatus, string> = {
  active: "Activo",
  paused: "Pausa consciente",
  inventory: "Inventario",
};

type CalibracionReinoProps = {
  onClose?: () => void;
  embedded?: boolean;
};

export function CalibracionReino({ onClose, embedded }: CalibracionReinoProps) {
  const [snapshot, setSnapshot] = useState<LudusCalibrationSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ludus/calibration", { cache: "no-store" });
      if (!response.ok) throw new Error("Error al cargar calibración.");
      setSnapshot(await response.json());
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar la Calibración del Reino.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (projectId: string, status: LudusProjectStatus) => {
    setBusyId(projectId);
    try {
      const response = await fetch("/api/ludus/calibration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, status }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Error al actualizar.");
      }
      setSnapshot(await response.json());
      toast.success(`Proyecto movido a ${STATUS_LABELS[status]}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        embedded ? "" : "mx-auto max-w-4xl px-4 py-6 sm:px-6",
      )}
    >
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber-300/60">
              Alpha · Vista de pájaro
            </p>
            <h2 className="text-xl font-semibold text-white">
              Calibración del Reino
            </h2>
          </div>
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white/50 hover:bg-white/5 hover:text-white"
              onClick={onClose}
            >
              Cerrar
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-white/50">
          Arrastrá proyectos al inventario o ponélos en pausa consciente. Sin
          actividad en{" "}
          <code className="text-white/60">data/</code> durante 7 días, aparece
          niebla de guerra.
        </p>
        {snapshot?.isSunday ? (
          <p className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 font-mono text-[11px] text-amber-200">
            <SparklesIcon className="size-3.5" />
            Domingo de calibración — momento ideal para reasignar recursos
          </p>
        ) : null}
        {snapshot ? (
          <p className="font-mono text-[11px] text-white/35">
            {snapshot.activeCount} activos · {snapshot.foggedCount} con niebla
          </p>
        ) : null}
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-white/40">
          <Loader2Icon className="size-6 animate-spin" />
        </div>
      ) : snapshot?.projects.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/40">
          No hay proyectos activos para calibrar.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {snapshot?.projects.map((project) => (
            <CalibrationCard
              key={project.id}
              project={project}
              busy={busyId === project.id}
              onStatusChange={updateStatus}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CalibrationCard({
  project,
  busy,
  onStatusChange,
}: {
  project: LudusCalibrationProject;
  busy: boolean;
  onStatusChange: (id: string, status: LudusProjectStatus) => void;
}) {
  return (
    <li
      className={cn(
        "castillo-card relative overflow-hidden p-4 transition-all",
        project.fogLevel === "heavy" && "ludus-fog-heavy",
        project.fogLevel === "light" && "ludus-fog-light",
        project.status === "paused" && "opacity-70",
        project.status === "inventory" && "opacity-50",
      )}
    >
      {project.fogLevel !== "none" && project.status === "active" ? (
        <div className="pointer-events-none absolute inset-0 ludus-fog-overlay" />
      ) : null}

      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-white">{project.title}</h3>
            <p className="font-mono text-[10px] text-white/40">
              {project.campo} · {project.estado}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px]",
              project.status === "active"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : project.status === "paused"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  : "border-white/15 bg-white/5 text-white/50",
            )}
          >
            {STATUS_LABELS[project.status]}
          </span>
        </div>

        {project.fogLevel !== "none" && project.status === "active" ? (
          <p className="flex items-center gap-1.5 font-mono text-[10px] text-violet-300/80">
            <CloudFogIcon className="size-3" />
            Niebla de guerra ·{" "}
            {project.daysSinceActivity ?? "?"} días sin actividad
          </p>
        ) : project.lastActivityAt ? (
          <p className="font-mono text-[10px] text-white/30">
            Última actividad:{" "}
            {new Date(project.lastActivityAt).toLocaleDateString("es-AR")}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || project.status === "active"}
            className="h-7 border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-200 hover:bg-emerald-500/20"
            onClick={() => onStatusChange(project.id, "active")}
          >
            <SwordsIcon className="size-3" />
            Activar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || project.status === "paused"}
            className="h-7 border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 hover:bg-amber-500/20"
            onClick={() => onStatusChange(project.id, "paused")}
          >
            <PauseIcon className="size-3" />
            Pausa
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || project.status === "inventory"}
            className="h-7 border-white/15 bg-white/5 text-xs text-white/60 hover:bg-white/10"
            onClick={() => onStatusChange(project.id, "inventory")}
          >
            <ArchiveIcon className="size-3" />
            Inventario
          </Button>
        </div>
      </div>
    </li>
  );
}
