"use client";

import { useBabel } from "@/components/babel/babel-context";
import { UniverseCalibrateSheet } from "@/components/babel/universe-calibrate-sheet";
import { UniverseImportSheet } from "@/components/babel/universe-import-sheet";
import { ROOT_UNIVERSE_SLUG } from "@/lib/babel/constants";
import { cn } from "@/lib/utils";
import { DownloadIcon, Loader2Icon, PlusIcon, ScaleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type UniverseSwitcherProps = {
  onImported?: () => void;
};

export function UniverseSwitcher({ onImported }: UniverseSwitcherProps) {
  const {
    universes,
    activeUniverse,
    isLoading,
    switchUniverse,
    discoverUniverse,
  } = useBabel();
  const [isCreating, setIsCreating] = useState(false);
  const [calibrateOpen, setCalibrateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleDiscover = async () => {
    const label = window.prompt("Nombre del nuevo Universo:");
    if (!label?.trim()) return;

    setIsCreating(true);
    try {
      await discoverUniverse(label.trim());
      toast.success(`Universo "${label.trim()}" descubierto.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear el universo.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {isLoading ? (
            <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            universes.map((universe) => (
              <button
                key={universe.slug}
                type="button"
                onClick={() => switchUniverse(universe.slug)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
                  activeUniverse?.slug === universe.slug
                    ? universe.isRoot
                      ? "bg-violet-500/15 text-violet-700 ring-1 ring-violet-500/30 dark:bg-violet-500/20 dark:text-violet-100 dark:ring-violet-400/30"
                      : "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {universe.label}
                {universe.trenchesWeight !== null ? (
                  <span className="ml-1 opacity-60">·{universe.trenchesWeight}</span>
                ) : null}
              </button>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleDiscover()}
          disabled={isCreating}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Descubrir universo"
        >
          {isCreating ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <PlusIcon className="size-3.5" />
          )}
        </button>

        {activeUniverse && !activeUniverse.isRoot ? (
          <>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Importar contenido"
            >
              <DownloadIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCalibrateOpen(true)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Calibrar universo"
            >
              <ScaleIcon className="size-3.5" />
            </button>
          </>
        ) : null}
      </div>

      {activeUniverse && activeUniverse.slug !== ROOT_UNIVERSE_SLUG ? (
        <>
          <UniverseCalibrateSheet
            universe={activeUniverse}
            open={calibrateOpen}
            onOpenChange={setCalibrateOpen}
          />
          <UniverseImportSheet
            open={importOpen}
            onOpenChange={setImportOpen}
            onImported={() => onImported?.()}
          />
        </>
      ) : null}
    </>
  );
}
