"use client";

import { Button } from "@/components/ui/button";
import type { ContextEventDto } from "@/lib/events/types";
import { PILLAR_LABELS } from "@/lib/events/types";
import { CheckCircle2Icon, Loader2Icon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type EventProposalsPanelProps = {
  events: ContextEventDto[];
  onResolved: () => void;
};

export function EventProposalsPanel({
  events,
  onResolved,
}: EventProposalsPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(events.map((e) => e.id)),
  );
  const [acting, setActing] = useState(false);

  if (events.length === 0) return null;

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;

    setActing(true);
    try {
      const response = await fetch(`/api/events/${ids[0]}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_batch", eventIds: ids }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron confirmar");
      }
      toast.success(`${ids.length} registro(s) confirmado(s)`);
      onResolved();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al confirmar";
      toast.error(message);
    } finally {
      setActing(false);
    }
  };

  const handleRejectAll = async () => {
    setActing(true);
    try {
      await Promise.all(
        events.map((event) =>
          fetch(`/api/events/${event.id}`, { method: "DELETE" }),
        ),
      );
      toast.success("Propuestas descartadas");
      onResolved();
    } catch {
      toast.error("No se pudieron descartar todas las propuestas");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="border-t border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium">Propuestas detectadas</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={acting}
            onClick={() => void handleRejectAll()}
          >
            <XIcon />
            Descartar
          </Button>
          <Button
            size="sm"
            disabled={acting || selected.size === 0}
            onClick={() => void handleConfirmSelected()}
          >
            {acting ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <CheckCircle2Icon />
            )}
            Confirmar ({selected.size})
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {events.map((event) => (
          <li key={event.id}>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-background p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.has(event.id)}
                onChange={() => toggle(event.id)}
              />
              <span>
                <span className="font-medium">
                  {PILLAR_LABELS[event.pillar]}
                </span>
                <span className="mt-0.5 block text-muted-foreground">
                  {event.content}
                </span>
                {event.links.length > 0 && (
                  <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                    {event.links
                      .map((l) => l.entityLabel ?? l.entityId)
                      .join(" · ")}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
