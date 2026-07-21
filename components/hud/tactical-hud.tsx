"use client";

import { AtanorRadar } from "@/components/hud/atanor-radar";
import { PulseInjection } from "@/components/hud/pulse-injection";
import { TrincheraSection } from "@/components/hud/trinchera-section";

export function TacticalHud() {
  return (
    <div className="hud-noir-root flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden text-foreground">
      <div className="pointer-events-none absolute inset-0 jornada-scanlines opacity-30" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col gap-5 overflow-y-auto px-4 py-6 md:px-6">
        <header className="shrink-0">
          <p className="font-mono text-[10px] tracking-[0.32em] text-accent uppercase">
            Deprocast OS · Legio Victrix
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            HUD Táctico
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Inyectá materia, vigilá el Atanor y bajá a la trinchera sin fricción.
          </p>
        </header>

        <div className="grid shrink-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,0.9fr)]">
          <div className="hud-noir-panel p-4 md:p-5">
            <PulseInjection />
          </div>
          <AtanorRadar />
        </div>

        <TrincheraSection />
      </div>
    </div>
  );
}
