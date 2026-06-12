"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  HourglassIcon,
  SparklesIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

type Metrics = {
  pureSignal: number;
  pendingRawMatter: number;
  pendingAudios: number;
  pendingDocuments: number;
  pendingProjects: number;
  signalPoints: number;
};

type MetricBlockProps = {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: number | null;
  detail: string;
};

function MetricBlock({
  icon: Icon,
  iconClassName,
  label,
  value,
  detail,
}: MetricBlockProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              iconClassName,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        <p className="text-3xl font-semibold tabular-nums tracking-tight">
          {value === null ? "—" : value}
        </p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function GnosisMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/metrics");
        if (!response.ok) return;
        const data: Metrics = await response.json();
        if (!cancelled) setMetrics(data);
      } catch {
        // Métricas no críticas: la home sigue funcionando sin ellas.
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Estado de Gnosis" className="space-y-3">
      <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Estado de Gnosis
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricBlock
          icon={SparklesIcon}
          iconClassName="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          label="Señal Pura"
          value={metrics ? metrics.pureSignal : null}
          detail="Audios transcriptos y estructurados"
        />
        <MetricBlock
          icon={HourglassIcon}
          iconClassName="bg-amber-500/15 text-amber-600 dark:text-amber-400"
          label="Materia Prima en cola"
          value={metrics ? metrics.pendingRawMatter : null}
          detail={
            metrics
              ? `${metrics.pendingAudios} audios · ${metrics.pendingDocuments} documentos pendientes`
              : "Audios y documentos esperando esterilización"
          }
        />
        <MetricBlock
          icon={ZapIcon}
          iconClassName="bg-violet-500/15 text-violet-600 dark:text-violet-400"
          label="Puntos de Señal"
          value={metrics ? metrics.signalPoints : null}
          detail="Estudianta · Focus Work en preparación"
        />
      </div>
    </section>
  );
}
