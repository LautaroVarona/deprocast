"use client";

import { Badge } from "@/components/ui/badge";
import type { PersonaActivityItem } from "@/lib/personas/types";
import { cn } from "@/lib/utils";
import {
  AudioLinesIcon,
  BookOpenIcon,
  MessageSquareIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";

type ActivityFeedProps = {
  items: PersonaActivityItem[];
  isLoading?: boolean;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SourceIcon({ sourceType }: { sourceType: string }) {
  switch (sourceType) {
    case "journal":
      return <BookOpenIcon className="size-3.5" aria-hidden />;
    case "chat":
      return <MessageSquareIcon className="size-3.5" aria-hidden />;
    case "transcript":
    case "audio_asset":
    case "parent_chunk":
      return <AudioLinesIcon className="size-3.5" aria-hidden />;
    default:
      return <SparklesIcon className="size-3.5" aria-hidden />;
  }
}

export function ActivityFeed({ items, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Recuperando muro de actividad…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Sin actividad indexada todavía. Las menciones del Purifier, el diario y
        el chat aparecerán aquí automáticamente.
      </div>
    );
  }

  return (
    <ul className="relative space-y-0">
      <div
        className="absolute top-2 bottom-2 left-[11px] w-px bg-border"
        aria-hidden
      />
      {items.map((item, index) => (
        <li key={item.id} className="relative pl-8 pb-4">
          <span
            className={cn(
              "absolute left-0 top-1.5 flex size-[22px] items-center justify-center rounded-full border border-border bg-background",
              item.kind === "chat" && "border-sky-500/40 text-sky-500",
              item.sourceType === "journal" && "border-violet-500/40 text-violet-500",
              (item.sourceType === "transcript" ||
                item.sourceType === "parent_chunk" ||
                item.sourceType === "audio_asset") &&
                "border-amber-500/40 text-amber-500",
            )}
          >
            <SourceIcon sourceType={item.sourceType} />
          </span>

          <article
            className={cn(
              "rounded-lg border border-border bg-muted/20 p-3",
              index === 0 && "border-emerald-500/30 bg-emerald-500/5",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                {item.sourceLabel}
              </Badge>
              <time
                dateTime={item.occurredAt}
                className="font-mono text-[10px] text-muted-foreground"
              >
                {formatWhen(item.occurredAt)}
              </time>
              {typeof item.confidence === "number" && (
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  conf. {Math.round(item.confidence * 100)}%
                </span>
              )}
            </div>

            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {item.fragment}
            </p>

            {item.sourceHref && (
              <Link
                href={item.sourceHref}
                className="mt-2 inline-block font-mono text-[10px] text-primary hover:underline"
              >
                Ver fuente →
              </Link>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
