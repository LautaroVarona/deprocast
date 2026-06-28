"use client";

import { CastilloCanvas } from "@/components/castillo/castillo-canvas";
import { CastilloCatalogPanel } from "@/components/castillo/castillo-catalog-panel";
import {
  CastilloProvider,
  useCastillo,
} from "@/components/castillo/castillo-context";
import { CastilloGridTabs } from "@/components/castillo/castillo-grid-tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, CastleIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";

function CastilloShell() {
  const { isLoading, isBusy, error, refresh } = useCastillo();

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
              Canvas futurista
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-white/50 hover:bg-white/5 hover:text-white"
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
