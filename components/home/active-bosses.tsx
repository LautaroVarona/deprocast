"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isHighPriorityProject } from "@/lib/projects/priority";
import type { Project } from "@/lib/projects/types";
import { FlameIcon, ShieldIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function BossCard({ boss }: { boss: Project }) {
  return (
    <Card className="border-red-500/40 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-sm leading-snug">
            ★ {boss.title}
          </CardTitle>
          <FlameIcon className="size-4 shrink-0 text-red-500" aria-hidden />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className="border-red-500/50 bg-red-500/15 font-semibold tabular-nums text-red-700 dark:text-red-300"
          >
            P {boss.prioridad} · I {boss.impacto}
          </Badge>
          <Badge variant="secondary">{boss.campo}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Avance{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {boss.avancePorcentaje}%
          </span>
        </span>
        <Link
          href="/proyectos"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Ver en Proyectos
        </Link>
      </CardContent>
    </Card>
  );
}

export function ActiveBosses() {
  const [bosses, setBosses] = useState<Project[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/proyectos");
        if (!response.ok) return;
        const data: { projects: Project[] } = await response.json();
        if (!cancelled) {
          setBosses(
            data.projects.filter((project) =>
              isHighPriorityProject(project.prioridad, project.impacto),
            ),
          );
        }
      } catch {
        if (!cancelled) setBosses([]);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Jefes Activos" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Jefes Activos
        </h2>
        <Link
          href="/proyectos"
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Panel de proyectos
        </Link>
      </div>

      {bosses === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Card key={index} className="h-36 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : bosses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <ShieldIcon className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">Sin Bosses activos</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              No hay proyectos con Prioridad o Impacto 10–12. Creá uno manualmente
              desde la sección Proyectos para verlo acá.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bosses.map((boss) => (
            <BossCard key={boss.id} boss={boss} />
          ))}
        </div>
      )}
    </section>
  );
}
