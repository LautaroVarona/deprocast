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
    glow: "from-amber-500/20 via-violet-500/10 to-transparent",
    border: "border-amber-500/40 hover:border-amber-400/60",
    icon: "text-amber-300",
    badge: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  },
  emerald: {
    glow: "from-emerald-500/15 to-transparent",
    border: "border-white/10",
    icon: "text-emerald-400/50",
    badge: "bg-white/5 text-white/40 border-white/10",
  },
  rose: {
    glow: "from-rose-500/15 to-transparent",
    border: "border-white/10",
    icon: "text-rose-400/50",
    badge: "bg-white/5 text-white/40 border-white/10",
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
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
          El mundo del Observador
        </p>
        <h1 className="bg-gradient-to-r from-white via-white/85 to-amber-200/70 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
          Elegí tu área
        </h1>
        <p className="mx-auto max-w-xl text-sm text-white/50">
          Toda la información ingestada y validada forma parte de este juego.
          Lo que organices aquí se refleja en Deprocast.
        </p>
        {!isLoading && stats ? (
          <p className="font-mono text-[11px] text-white/35">
            {stats.catalogTotal} ítems en catálogo · {stats.placedOnCanvas}{" "}
            colocados en el Castillo
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
                      "flex size-11 items-center justify-center rounded-xl border border-white/10 bg-black/30",
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
                    <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300/80">
                      Disponible
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-white">{area.name}</h2>
                  <p className="text-sm leading-relaxed text-white/55">
                    {area.description}
                  </p>
                </div>

                <p className="mt-auto font-mono text-[10px] text-white/30">
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
