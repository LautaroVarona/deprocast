"use client";

import type { NotebookSummary } from "@/lib/cuadernos/types";
import { cn } from "@/lib/utils";
import { BookOpenIcon, LayersIcon } from "lucide-react";
import Link from "next/link";

type NotebookCellProps = {
  notebook: NotebookSummary;
  stagger?: boolean;
};

export function NotebookCell({ notebook, stagger }: NotebookCellProps) {
  const progress =
    notebook.pageCount > 0
      ? Math.round((notebook.processedCount / notebook.pageCount) * 100)
      : 0;

  return (
    <Link
      href={`/ingesta/cuadernos/${notebook.id}`}
      className={cn(
        "group relative block transition-transform duration-200 hover:scale-[1.02]",
        stagger && "translate-y-6 sm:translate-y-8",
      )}
    >
      <div
        className={cn(
          "relative aspect-[3/4] overflow-hidden rounded-lg border",
          "border-border bg-background shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]",
          "transition-colors group-hover:border-border",
        )}
        style={{
          boxShadow: `inset 0 0 40px hsl(${notebook.coverHue} 30% 8% / 0.6)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `linear-gradient(145deg, hsl(${notebook.coverHue} 40% 25%), transparent 60%)`,
          }}
        />

        <div className="absolute inset-0 flex flex-col justify-between p-3">
          <div className="flex items-start justify-between gap-2">
            <BookOpenIcon className="size-4 text-muted-foreground" aria-hidden />
            <span className="font-mono text-[10px] text-muted-foreground">
              {notebook.pageCount} pág.
            </span>
          </div>

          <div>
            <h3 className="line-clamp-2 text-sm font-medium tracking-tight text-foreground">
              {notebook.title}
            </h3>
            {notebook.description ? (
              <p className="mt-1 line-clamp-2 font-mono text-[10px] text-muted-foreground">
                {notebook.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-card">
          <div
            className="h-full bg-muted-foreground transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <p className="mt-2 text-center font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        {notebook.processedCount}/{notebook.pageCount} vectorizadas
      </p>
    </Link>
  );
}

type NotebookGalleryProps = {
  notebooks: NotebookSummary[];
  isLoading?: boolean;
};

export function NotebookGallery({ notebooks, isLoading }: NotebookGalleryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "aspect-[3/4] animate-pulse rounded-lg border border-border bg-background",
              index % 2 === 1 && "translate-y-6 sm:translate-y-8",
            )}
          />
        ))}
      </div>
    );
  }

  if (notebooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <LayersIcon className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
          Panal vacío
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Creá tu primer cuaderno físico para comenzar la ingesta atómica.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {notebooks.map((notebook, index) => (
        <NotebookCell
          key={notebook.id}
          notebook={notebook}
          stagger={index % 2 === 1}
        />
      ))}
    </div>
  );
}
