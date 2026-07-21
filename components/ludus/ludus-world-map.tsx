"use client";

import { LUDUS_AREAS } from "@/lib/ludus/constants";
import type { LudusWorldStats } from "@/lib/ludus/types";
import { cn } from "@/lib/utils";
import {
  CastleIcon,
  LockIcon,
  TentIcon,
  ShieldIcon,
} from "lucide-react";
import Link from "next/link";

const AREA_ICONS = {
  castillo: CastleIcon,
  campamento: TentIcon,
  trinchera: ShieldIcon,
} as const;

const ACCENT_STYLES = {
  amber: {
    glow: "from-accent/20 via-primary/10 to-transparent",
    border: "border-accent/40 hover:border-accent/60",
    icon: "text-accent",
    badge: "bg-accent/15 text-accent border-accent/30",
  },
  emerald: {
    glow: "from-chart-3/20 via-primary/8 to-transparent",
    border: "border-chart-3/35 hover:border-chart-3/55",
    icon: "text-chart-3",
    badge: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  },
  rose: {
    glow: "from-destructive/20 via-accent/8 to-transparent",
    border: "border-destructive/35 hover:border-destructive/55",
    icon: "text-destructive",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
  },
} as const;

type LudusWorldMapProps = {
  stats: LudusWorldStats | null;
  isLoading?: boolean;
};

export function LudusWorldMap({ stats, isLoading }: LudusWorldMapProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6">
      <header className="space-y-3 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          El mundo del Observador
        </p>
        <h1 className="bg-gradient-to-r from-foreground via-foreground/85 to-accent/70 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
          Elegí tu área
        </h1>
        <p className="mx-auto max-w-xl text-sm text-muted-foreground">
          Toda la información ingestada y validada forma parte de este juego.
          Lo que organices aquí se refleja en Deprocast.
        </p>
        {!isLoading && stats ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            {stats.catalogTotal} ítems en catálogo · {stats.placedOnCanvas}{" "}
            colocados ·{" "}
            <span className="text-accent">
              {stats.signalPoints} Puntos de Señal
            </span>
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {LUDUS_AREAS.map((area) => {
          const Icon = AREA_ICONS[area.id];
          const styles = ACCENT_STYLES[area.accent as keyof typeof ACCENT_STYLES];

          const inner = (
            <article
              className={cn(
                "castillo-card relative flex h-full min-h-[220px] flex-col overflow-hidden p-6 transition-all duration-300",
                area.available
                  ? cn("cursor-pointer hover:-translate-y-1 hover:shadow-2xl", styles.border)
                  : "cursor-not-allowed opacity-55",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br",
                  styles.glow,
                )}
              />
              <div className="relative flex flex-1 flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl border border-border bg-card/80",
                      styles.icon,
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {!area.available ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]",
                        styles.badge,
                      )}
                    >
                      <LockIcon className="size-3" />
                      Próximamente
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                      Disponible
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">{area.name}</h2>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {area.frequency} · {area.horizon}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {area.description}
                  </p>
                </div>

                <p className="mt-auto font-mono text-[10px] text-muted-foreground">
                  {area.lore}
                </p>
              </div>
            </article>
          );

          if (area.available) {
            return (
              <Link key={area.id} href={area.href} className="block h-full">
                {inner}
              </Link>
            );
          }

          return (
            <div key={area.id} aria-disabled className="h-full">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
