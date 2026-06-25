"use client";

import type { XBookmarkRecord } from "@/lib/ingesta/x-bookmarks/types";
import { cn } from "@/lib/utils";
import { SparklesIcon } from "lucide-react";

type XBookmarkEnrichedPanelProps = {
  bookmarks: XBookmarkRecord[];
  className?: string;
};

export function XBookmarkEnrichedPanel({
  bookmarks,
  className,
}: XBookmarkEnrichedPanelProps) {
  if (bookmarks.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border px-4 py-8 text-center",
          className,
        )}
      >
        <p className="font-mono text-[10px] text-muted-foreground">
          Aún no hay marcadores enriquecidos. Calibrá y procesá el umbral.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <SparklesIcon className="size-3.5 text-primary" />
        <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          Corpus enriquecido · listo para Qorpus
        </p>
      </div>

      <ul className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
        {bookmarks.map((bookmark) => (
          <li
            key={bookmark.id}
            className="rounded-md border border-border bg-muted/20 px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">
                  {bookmark.titleEs ?? bookmark.text.slice(0, 80)}
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                  {bookmark.handle} · peso {bookmark.weight}
                </p>
              </div>
              {bookmark.linkedProjects && bookmark.linkedProjects.length > 0 && (
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  {bookmark.linkedProjects.map((project) => (
                    <span
                      key={project}
                      className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] text-primary"
                    >
                      {project}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {bookmark.metaTags && bookmark.metaTags.length > 0 && (
              <p className="mt-2 font-mono text-[9px] text-muted-foreground">
                {bookmark.metaTags.join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
