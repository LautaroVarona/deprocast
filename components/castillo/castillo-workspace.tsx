"use client";

import { CastilloCanvas } from "@/components/castillo/castillo-canvas";
import { CastilloCatalogPanel } from "@/components/castillo/castillo-catalog-panel";
import {
  CastilloProvider,
  useCastillo,
} from "@/components/castillo/castillo-context";
import { CastilloGridTabs } from "@/components/castillo/castillo-grid-tabs";
import { CalibracionReino } from "@/components/ludus/calibracion-reino";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  CastleIcon,
  CrownIcon,
  RefreshCwIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function CastilloShell() {
  const { isLoading, isBusy, error, refresh } = useCastillo();
  const [showCalibration, setShowCalibration] = useState(false);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
        <Link
          href="/ludus"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-white/60 hover:bg-white/5 hover:text-white",
          )}
        >
          <ArrowLeftIcon className="size-3.5" />
          Mapa
        </Link>

        <div className="flex items-center gap-2">
          <CastleIcon className="size-4 text-amber-300/80" aria-hidden />
          <div>
            <h1 className="text-sm font-semibold text-white">Castillo</h1>
            <p className="font-mono text-[10px] text-white/35">
              Alpha · Vista de pájaro
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 hover:bg-amber-500/20"
          onClick={() => setShowCalibration(true)}
        >
          <CrownIcon className="size-3.5" />
          Calibración del Reino
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-white/50 hover:bg-white/5 hover:text-white"
          onClick={() => void refresh()}
          disabled={isBusy}
          aria-label="Actualizar"
        >
          <RefreshCwIcon
            className={isLoading || isBusy ? "animate-spin" : ""}
          />
        </Button>
      </header>

      {error ? (
        <p className="shrink-0 border-b border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col border-r border-white/10 bg-black/25 lg:w-80">
          <CastilloGridTabs />
          <CastilloCatalogPanel />
        </aside>
        <main className="min-w-0 flex-1 overflow-hidden">
          <CastilloCanvas />
        </main>
      </div>

      {showCalibration ? (
        <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm pt-8 pb-16">
          <div className="castillo-card mx-4 w-full max-w-4xl border border-amber-500/20 p-2 shadow-2xl">
            <CalibracionReino
              embedded
              onClose={() => setShowCalibration(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CastilloWorkspace() {
  return (
    <CastilloProvider>
      <CastilloShell />
    </CastilloProvider>
  );
}
