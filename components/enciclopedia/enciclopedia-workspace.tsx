"use client";

import { ConceptSearchPanel } from "@/components/enciclopedia/concept-search-panel";
import {
  EnciclopediaProvider,
  useEnciclopedia,
} from "@/components/enciclopedia/enciclopedia-context";
import { EntryFeedbackBar } from "@/components/enciclopedia/entry-feedback-bar";
import { EntryViewer } from "@/components/enciclopedia/entry-viewer";
import { ExplorationGraph } from "@/components/enciclopedia/exploration-graph";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpenIcon, Loader2Icon, RotateCcwIcon } from "lucide-react";

function EnciclopediaPanels() {
  const { error, isBusy, resetSession, sessionEntries } = useEnciclopedia();

  return (
    <div className="enciclopedia-noir-root mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpenIcon className="size-5 text-amber-400/70" />
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
                Enciclopediador
              </p>
            </div>
            <h1 className="bg-gradient-to-r from-amber-100 via-amber-50/90 to-white/50 bg-clip-text font-mono text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
              Explora el conocimiento, un concepto a la vez
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-white/45">
              Pedia es una enciclopedia generativa que crece con cada pregunta.
              Subrayá una palabra, descubrí su significado y seguí el hilo del
              conocimiento.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isBusy ? (
              <span className="flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-200/80">
                <Loader2Icon className="size-3 animate-spin" />
                Generando…
              </span>
            ) : null}
            {sessionEntries.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetSession}
                className="border-white/15 bg-transparent font-mono text-[10px] uppercase tracking-wider text-white/50"
              >
                <RotateCcwIcon className="size-3.5" />
                Nueva sesión
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {error ? (
        <div
          className={cn(
            "rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3",
            "font-mono text-xs text-rose-200/90",
          )}
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="flex flex-col gap-4">
          <ConceptSearchPanel />
          <EntryViewer />
          <EntryFeedbackBar />
        </div>
        <ExplorationGraph />
      </div>
    </div>
  );
}

export function EnciclopediaWorkspace() {
  return (
    <EnciclopediaProvider>
      <EnciclopediaPanels />
    </EnciclopediaProvider>
  );
}
