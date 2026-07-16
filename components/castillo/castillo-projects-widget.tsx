"use client";

import { useBabel } from "@/components/babel/babel-context";
import { Button } from "@/components/ui/button";
import { useCastillo } from "@/components/castillo/castillo-context";
import type { Project } from "@/lib/projects/types";
import { SOURCE_TYPE_ACCENTS } from "@/lib/castillo/constants";
import { cn } from "@/lib/utils";
import { SparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function CastilloProjectsWidget() {
  const { universeFetch } = useBabel();
  const { placeItem, activeGridId, isBusy } = useCastillo();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    void universeFetch("/api/proyectos", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudieron cargar proyectos.");
        const data = (await res.json()) as { projects?: Project[] };
        setProjects(data.projects ?? []);
      })
      .catch(() => {
        setProjects([]);
      })
      .finally(() => setIsLoading(false));
  }, [universeFetch]);

  const consolidated = projects.filter((p) => p.estado !== "Idea").slice(0, 6);

  if (isLoading || consolidated.length === 0) return null;

  return (
    <div className="border-b border-white/10 p-3">
      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
        <SparklesIcon className="size-3.5 text-emerald-300/80" />
        Proyectos consolidados
      </p>

      <ul className="mt-2 space-y-2">
        {consolidated.map((project) => (
          <li key={project.id} className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="line-clamp-2 text-xs font-medium text-white">
                {project.title}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-white/35">
                {project.estado}
              </p>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className={cn(
                "size-8 shrink-0 text-white/50 hover:bg-white/10 hover:text-white",
                (!activeGridId || isBusy) && "opacity-50",
              )}
              disabled={!activeGridId || isBusy}
              onClick={() => {
                void placeItem({
                  sourceType: "project",
                  sourceId: project.id,
                  title: project.title,
                  subtitle: project.estado,
                  accentHint: SOURCE_TYPE_ACCENTS.project,
                  deepLink: `/proyectos?highlight=${project.id}`,
                  meta: {
                    campoSlug: project.campoSlug,
                    status: project.estado,
                  },
                  placed: false,
                });
              }}
              aria-label={`Colocar ${project.title} en el canvas`}
            >
              +
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

