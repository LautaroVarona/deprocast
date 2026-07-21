"use client";

import type { MissionCardDto } from "@/lib/calendario/types";
import {
  ECOSYSTEM_AREAS,
  ECOSYSTEM_AREA_LABELS,
} from "@/lib/calendario/constants";
import type { EcosystemArea } from "@/lib/calendario/constants";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";

type SuggestionDeckProps = {
  cards: MissionCardDto[];
  isLoading?: boolean;
  selectedCardId?: string | null;
  areaFilter?: EcosystemArea | null;
  onAreaFilterChange?: (area: EcosystemArea | null) => void;
  onSelectCard?: (card: MissionCardDto) => void;
  skin?: "noir" | "ludus";
};

export function SuggestionDeck({
  cards,
  isLoading = false,
  selectedCardId,
  areaFilter,
  onAreaFilterChange,
  onSelectCard,
  skin = "noir",
}: SuggestionDeckProps) {
  const panelClass =
    skin === "noir"
      ? "calendario-noir-panel border-border"
      : "border-border bg-card/80";

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col rounded-xl border lg:w-64",
        panelClass,
      )}
    >
      <header className="border-b border-border px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/80">
          Mazo de misiones
        </p>
        <p className="text-[11px] text-muted-foreground">Fase de reclutamiento</p>
      </header>

      {onAreaFilterChange ? (
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          <button
            type="button"
            onClick={() => onAreaFilterChange(null)}
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase",
              !areaFilter
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Todas
          </button>
          {ECOSYSTEM_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => onAreaFilterChange(area)}
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase",
                areaFilter === area
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {ECOSYSTEM_AREA_LABELS[area].slice(0, 4)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
            <Loader2Icon className="size-3 animate-spin" />
            Barajando…
          </div>
        ) : cards.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">Mazo vacío. Revisá Pendientes o Diario.</p>
        ) : (
          cards.map((card) => (
            <button
              key={card.id}
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("kind", "card");
                event.dataTransfer.setData("cardSource", card.source);
                event.dataTransfer.setData("cardId", card.sourceId);
                event.dataTransfer.setData("durationMin", String(card.durationMin));
              }}
              onClick={() => onSelectCard?.(card)}
              className={cn(
                "w-full rounded-md border border-primary/30 bg-primary/10 px-2.5 py-2 text-left text-xs text-foreground transition-all hover:border-primary/50",
                selectedCardId === card.id && "ring-2 ring-primary/60",
              )}
            >
              <p className="line-clamp-2">{card.title}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                G{card.actionCost} · {card.durationMin}m
                {card.ecosystemArea
                  ? ` · ${ECOSYSTEM_AREA_LABELS[card.ecosystemArea]}`
                  : ""}
              </p>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
