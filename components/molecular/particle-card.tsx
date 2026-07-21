"use client";

import { BLOQUE_COLORS } from "@/lib/jornada/constants";
import type { ParticulaMetadata } from "@/lib/molecular-processing/types";
import { cn } from "@/lib/utils";
import { AtomIcon } from "lucide-react";

type ParticleCardProps = {
  particula: ParticulaMetadata;
  index: number;
  visible: boolean;
  compact?: boolean;
  className?: string;
};

export function ParticleCard({
  particula,
  index,
  visible,
  compact = false,
  className,
}: ParticleCardProps) {
  const preview =
    particula.textoFragmento.length > 80
      ? `${particula.textoFragmento.slice(0, 77)}…`
      : particula.textoFragmento;

  return (
    <article
      className={cn(
        "molecular-particle group relative overflow-hidden rounded-lg border border-border bg-foreground/[0.03] transition-all duration-500",
        visible
          ? "molecular-particle--visible translate-y-0 scale-100 opacity-100"
          : "translate-y-3 scale-95 opacity-0",
        compact ? "p-2.5" : "p-3.5",
        className,
      )}
      style={{ transitionDelay: `${index * 55}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative flex items-start gap-2">
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-border bg-card/80">
          <AtomIcon className="size-3 text-primary/70" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p
            className={cn(
              "font-mono leading-snug text-muted-foreground",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            {preview}
          </p>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <span>#{String(index + 1).padStart(2, "0")}</span>
            <span className="text-muted-foreground">·</span>
            <span>{particula.fuenteOrigen}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ParticleTag({
  label,
  bloque,
  className,
}: {
  label: string;
  bloque?: keyof typeof BLOQUE_COLORS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-border bg-card/80 px-2 py-0.5 font-mono text-[10px] text-muted-foreground",
        bloque && BLOQUE_COLORS[bloque],
        className,
      )}
    >
      {label}
    </span>
  );
}
