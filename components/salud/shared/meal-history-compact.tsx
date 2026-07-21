"use client";

import { formatElapsedCompact } from "@/components/salud/lib/fasting";
import type { MealWithBrokenFast } from "@/components/salud/lib/fasting";
import { cn } from "@/lib/utils";
import { ImageIcon, MicIcon } from "lucide-react";

type MealHistoryCompactProps = {
  items: MealWithBrokenFast[];
  isLoading: boolean;
  highlightId?: string | null;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function MealHistoryCompact({
  items,
  isLoading,
  highlightId,
}: MealHistoryCompactProps) {
  const sorted = [...items].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const recent = sorted.slice(0, 3);
  const highlight =
    highlightId && !recent.some((item) => item.id === highlightId)
      ? sorted.find((item) => item.id === highlightId)
      : null;

  const displayItems = highlight ? [highlight, ...recent].slice(0, 4) : recent;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-muted/40">
      <p className="shrink-0 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Historial
      </p>
      <div className="min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <p className="p-3 text-xs text-muted-foreground">Cargando...</p>
        ) : displayItems.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">Sin ingestas aún.</p>
        ) : (
          <ul className="divide-y divide-border">
            {displayItems.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "px-3 py-2",
                  item.id === highlightId && "bg-emerald-500/5",
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                    {formatTime(item.occurredAt)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-medium text-foreground">
                      {item.descripcion}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {item.modality === "audio" ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <MicIcon className="size-3" />
                          Audio
                        </span>
                      ) : null}
                      {item.modality === "imagen" ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <ImageIcon className="size-3" />
                          Foto
                        </span>
                      ) : null}
                      {item.caloriesLabel ? (
                        <span className="font-mono text-[10px] text-emerald-500/80">
                          {item.caloriesLabel}
                        </span>
                      ) : null}
                      {item.brokenFastMs && item.brokenFastMs > 0 ? (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          +{formatElapsedCompact(item.brokenFastMs)} ayuno
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
