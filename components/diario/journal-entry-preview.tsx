"use client";

import { getOndaShortLabel, ONDA_BADGE_STYLES } from "@/components/diario/constants";
import { Badge } from "@/components/ui/badge";
import type { JournalEntryDetail } from "@/lib/journal/types";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

type JournalEntryPreviewProps = {
  entry: JournalEntryDetail | null;
  isLoading?: boolean;
  onClose: () => void;
};

export function JournalEntryPreview({
  entry,
  isLoading,
  onClose,
}: JournalEntryPreviewProps) {
  if (!entry && !isLoading) return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-2 shrink-0 border-b border-border bg-muted/20 duration-200">
      <div className="flex items-start justify-between gap-2 px-4 py-2">
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <p className="font-mono text-[10px] text-muted-foreground">
              Cargando entrada…
            </p>
          ) : entry ? (
            <>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {entry.fechaRegistro}
                </span>
                <Badge
                  className={cn(
                    "h-4 px-1.5 text-[10px] font-medium",
                    ONDA_BADGE_STYLES[entry.onda],
                  )}
                >
                  {getOndaShortLabel(entry.onda)}
                </Badge>
              </div>
              <p className="truncate text-xs font-medium">{entry.title}</p>
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Cerrar vista previa"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>

      {entry && (
        <div className="max-h-28 overflow-y-auto px-4 pb-3">
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
            {entry.body}
          </pre>
        </div>
      )}
    </div>
  );
}
