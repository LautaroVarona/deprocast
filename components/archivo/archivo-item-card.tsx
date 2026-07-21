"use client";

import {
  ARCHIVO_KIND_LABELS,
  type ArchivoItemSummary,
} from "@/lib/archivo/types";
import { cn } from "@/lib/utils";

type ArchivoItemCardProps = {
  item: ArchivoItemSummary;
  selected: boolean;
  onSelect: () => void;
  formatDate: (iso: string) => string;
  snippet?: string;
};

export function ArchivoItemCard({
  item,
  selected,
  onSelect,
  formatDate,
  snippet,
}: ArchivoItemCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "archivo-noir-card flex flex-col gap-2 rounded-lg border p-3 text-left transition",
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card/80 hover:border-border hover:bg-foreground/[0.03]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 font-mono text-sm leading-snug text-muted-foreground">
          {item.title}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {formatDate(item.createdAt)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
        <span className="rounded border border-border px-1.5 py-0.5 text-muted-foreground">
          {ARCHIVO_KIND_LABELS[item.kind]}
        </span>
        {item.strongestTag ? (
          <span className="rounded border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-accent/90">
            #{item.strongestTag.label}
            <span className="ml-1 text-accent/40">
              · peso {item.strongestTag.weight}
            </span>
          </span>
        ) : null}
      </div>

      <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
        {snippet ?? item.preview}
      </p>

      <span className="mt-auto font-mono text-[10px] tabular-nums text-muted-foreground">
        {item.charCount.toLocaleString("es-AR")} caracteres
      </span>
    </button>
  );
}
