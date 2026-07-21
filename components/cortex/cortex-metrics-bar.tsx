"use client";

import { SemanticBiasChart } from "@/components/cortex/semantic-bias-chart";
import { Card, CardContent } from "@/components/ui/card";
import { AREA_THEMES } from "@/lib/meta-meteador/area-theme";
import type { CortexSnapshot } from "@/lib/cortex/types";
import { cn } from "@/lib/utils";
import {
  BrainCircuitIcon,
  FileCheckIcon,
  NetworkIcon,
  type LucideIcon,
} from "lucide-react";

type CortexMetricsBarProps = {
  snapshot: CortexSnapshot | null;
  isLoading?: boolean;
};

type KpiCardProps = {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string | number;
  detail: string;
};

function KpiCard({
  icon: Icon,
  iconClassName,
  label,
  value,
  detail,
}: KpiCardProps) {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardContent className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              iconClassName,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        </div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function CortexMetricsBar({ snapshot, isLoading }: CortexMetricsBarProps) {
  const dominant = snapshot?.dominantAreaThisWeek;
  const dominantTheme = dominant ? AREA_THEMES[dominant] : null;

  return (
    <section aria-label="Analytics del Córtex" className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <KpiCard
            icon={NetworkIcon}
            iconClassName="bg-primary/15 text-primary dark:text-primary"
            label="Total Nodos Indexados"
            value={isLoading ? "—" : (snapshot?.totalNodesIndexed ?? 0)}
            detail="Entidades en el grafo de conocimiento"
          />
          <KpiCard
            icon={FileCheckIcon}
            iconClassName="bg-primary/15 text-primary dark:text-primary"
            label="Documentos Validados"
            value={isLoading ? "—" : (snapshot?.validatedDocuments ?? 0)}
            detail="Nodos con metadatos Meta-Meteador"
          />
          <KpiCard
            icon={BrainCircuitIcon}
            iconClassName={cn(
              dominantTheme?.bgClass ?? "bg-muted",
              dominantTheme?.textClass ?? "text-muted-foreground",
            )}
            label="Área Dominante esta Semana"
            value={
              isLoading
                ? "—"
                : dominantTheme?.label ?? "Sin señal"
            }
            detail="Ponderación semántica · últimos 7 días"
          />
        </div>

        <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
          <CardContent>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Sesgo Semántico
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Promedio de relevancia por área · ventana 7d
                </p>
              </div>
            </div>
            {isLoading ? (
              <div className="h-36 animate-pulse rounded-lg bg-muted/50" />
            ) : (
              <SemanticBiasChart data={snapshot?.semanticBias ?? []} />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
