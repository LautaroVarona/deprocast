"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  AREA_FILTER_THRESHOLD,
  AREA_THEMES,
  getDominantAreas,
} from "@/lib/meta-meteador/area-theme";
import type { CortexNode } from "@/lib/cortex/types";
import { cn } from "@/lib/utils";
import {
  FileAudioIcon,
  FileTextIcon,
  FileTypeIcon,
  FileIcon,
  CastleIcon,
} from "lucide-react";
import Link from "next/link";

const FORMATO_CONFIG = {
  audio: {
    label: "Audio",
    icon: FileAudioIcon,
    className: "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-300",
  },
  word: {
    label: "Word",
    icon: FileTypeIcon,
    className: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300",
  },
  texto: {
    label: "Texto",
    icon: FileTextIcon,
    className: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30 dark:text-cyan-300",
  },
  documento: {
    label: "Documento",
    icon: FileIcon,
    className: "bg-muted text-muted-foreground border-border",
  },
} as const;

type KnowledgeCardProps = {
  node: CortexNode;
};

export function KnowledgeCard({ node }: KnowledgeCardProps) {
  const formato = FORMATO_CONFIG[node.formato];
  const FormatoIcon = formato.icon;
  const dominantAreas = getDominantAreas(node.areas, 2);

  const href = node.campoSlug
    ? `/proyectos?highlight=${node.id}`
    : "/proyectos";

  return (
    <Link href={href} className="group block h-full">
      <Card className="flex h-full flex-col border-border/60 bg-card/90 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        <CardHeader className="gap-2 pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight group-hover:text-primary">
              {node.titulo}
            </h3>
            <Badge
              variant="outline"
              className={cn("shrink-0 gap-1 text-[10px]", formato.className)}
            >
              <FormatoIcon className="size-3" aria-hidden />
              {formato.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {[node.materia, node.particula, node.campo]
              .filter(Boolean)
              .map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-1.5 border-t border-border/50 pt-3">
          {node.castlePlacement ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
              <CastleIcon className="size-3" aria-hidden />
              En el Castillo
              {node.castlePlacement.tagCount > 0 ? (
                <span className="tabular-nums">
                  · {node.castlePlacement.tagCount} tag
                  {node.castlePlacement.tagCount === 1 ? "" : "s"}
                </span>
              ) : null}
            </span>
          ) : null}
          {dominantAreas.length === 0 ? (
            <span className="text-[10px] text-muted-foreground">
              Sin áreas dominantes
            </span>
          ) : (
            dominantAreas.map(({ area, porcentaje }) => {
              const theme = AREA_THEMES[area];
              const Icon = theme.icon;
              const isSignificant =
                (node.areas[area]?.score_1_12 ?? 0) > AREA_FILTER_THRESHOLD;

              return (
                <span
                  key={area}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    theme.chipClass,
                    isSignificant && "ring-1 ring-offset-1 ring-offset-background",
                    isSignificant && theme.borderClass,
                  )}
                >
                  <Icon className="size-3" aria-hidden />
                  {theme.shortLabel}{" "}
                  <span className="tabular-nums">{porcentaje}%</span>
                </span>
              );
            })
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
