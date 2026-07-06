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
          ? "border-sky-500/40 bg-sky-500/5"
          : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-white/[0.03]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 font-mono text-sm leading-snug text-white/90">
          {item.title}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-white/30">
          {formatDate(item.createdAt)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
        <span className="rounded border border-white/10 px-1.5 py-0.5 text-white/45">
          {ARCHIVO_KIND_LABELS[item.kind]}
        </span>
        {item.strongestTag ? (
          <span className="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-amber-200/90">
            #{item.strongestTag.label}
            <span className="ml-1 text-amber-200/40">
              · peso {item.strongestTag.weight}
            </span>
          </span>
        ) : null}
      </div>

      <p className="line-clamp-3 text-xs leading-relaxed text-white/40">
        {snippet ?? item.preview}
      </p>

      <span className="mt-auto font-mono text-[10px] tabular-nums text-white/25">
        {item.charCount.toLocaleString("es-AR")} caracteres
      </span>
    </button>
  );
}
