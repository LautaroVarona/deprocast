"use client";

import type { HealthRecordDto } from "@/lib/events/types";
import { PILLAR_LABELS } from "@/lib/events/types";
import { cn } from "@/lib/utils";

type HealthTimelineProps = {
  records: HealthRecordDto[];
  isLoading: boolean;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HealthTimeline({ records, isLoading }: HealthTimelineProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Cargando telemetría...
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Sin registros todavía. El cuerpo es el soporte — empezá por un bloque o
        check-in.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {records.map((record) => (
        <li key={record.id} className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{record.summary}</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                {formatWhen(record.occurredAt)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-md border border-border px-2 py-0.5 font-mono text-[10px]",
              )}
            >
              {PILLAR_LABELS[record.pillar]}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
