"use client";

import { formatElapsedCompact } from "@/components/salud/lib/fasting";
import type { MealWithBrokenFast } from "@/components/salud/lib/fasting";
import { cn } from "@/lib/utils";
import { ImageIcon, MicIcon } from "lucide-react";

type MealHistoryFeedProps = {
  items: MealWithBrokenFast[];
  isLoading: boolean;
};

function formatListTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatListDay(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

function ModalityBadge({
  modality,
  attachmentLabel,
}: {
  modality: MealWithBrokenFast["modality"];
  attachmentLabel?: string;
}) {
  if (modality === "texto") return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700/80 bg-zinc-800/60 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
      {modality === "audio" ? (
        <>
          <MicIcon className="size-3" />
          Audio
        </>
      ) : (
        <>
          <ImageIcon className="size-3" />
          {attachmentLabel ?? "Imagen"}
        </>
      )}
    </span>
  );
}

export function MealHistoryFeed({ items, isLoading }: MealHistoryFeedProps) {
  const sorted = [...items].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  if (isLoading) {
    return (
      <p className="px-4 py-6 text-sm text-zinc-500">Cargando historial...</p>
    );
  }

  if (sorted.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-zinc-500">
        Sin ingestas registradas todavía.
      </p>
    );
  }

  return (
    <ul className="space-y-0 px-4 pb-6">
      {sorted.map((item, index) => {
        const showDay =
          index === 0 ||
          formatListDay(item.occurredAt) !==
            formatListDay(sorted[index - 1].occurredAt);

        return (
          <li key={item.id} className="relative flex gap-4">
            <div className="flex w-14 shrink-0 flex-col items-end pt-4">
              {showDay ? (
                <span className="font-mono text-[10px] uppercase text-zinc-600">
                  {formatListDay(item.occurredAt)}
                </span>
              ) : null}
              <span className="font-mono text-sm tabular-nums text-zinc-400">
                {formatListTime(item.occurredAt)}
              </span>
              {index < sorted.length - 1 ? (
                <span
                  className="absolute left-[3.25rem] top-10 bottom-0 w-px bg-zinc-800/80"
                  aria-hidden
                />
              ) : null}
            </div>

            <article
              className={cn(
                "my-2 min-w-0 flex-1 rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-4 py-3",
                "transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/50",
              )}
            >
              <p className="text-sm font-medium text-zinc-100">
                {item.descripcion}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ModalityBadge
                  modality={item.modality}
                  attachmentLabel={item.attachmentLabel}
                />
                {item.brokenFastMs !== null && item.brokenFastMs > 0 ? (
                  <span className="font-mono text-[10px] text-zinc-500">
                    Terminó un ayuno de {formatElapsedCompact(item.brokenFastMs)}
                  </span>
                ) : null}
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
