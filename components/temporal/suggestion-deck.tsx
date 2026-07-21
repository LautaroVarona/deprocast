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
      ? "calendario-noir-panel border-white/8"
      : "border-white/10 bg-black/25";

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col rounded-xl border lg:w-64",
        panelClass,
      )}
    >
      <header className="border-b border-white/10 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400/80">
          Mazo de misiones
        </p>
        <p className="text-[11px] text-zinc-500">Fase de reclutamiento</p>
      </header>

      {onAreaFilterChange ? (
        <div className="flex flex-wrap gap-1 border-b border-white/10 p-2">
          <button
            type="button"
            onClick={() => onAreaFilterChange(null)}
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[9px] uppercase",
              !areaFilter
                ? "bg-cyan-500/20 text-cyan-200"
                : "text-zinc-500 hover:text-zinc-300",
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
                "rounded px-1.5 py-0.5 font-mono text-[9px] uppercase",
                areaFilter === area
                  ? "bg-cyan-500/20 text-cyan-200"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {ECOSYSTEM_AREA_LABELS[area].slice(0, 4)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center gap-2 p-2 text-xs text-zinc-500">
            <Loader2Icon className="size-3 animate-spin" />
            Barajando…
          </div>
        ) : cards.length === 0 ? (
          <p className="p-2 text-xs text-zinc-500">Mazo vacío. Revisá Pendientes o Diario.</p>
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
                "w-full rounded-md border border-violet-500/30 bg-violet-950/25 px-2.5 py-2 text-left text-xs text-violet-100 transition-all hover:border-violet-400/50",
                selectedCardId === card.id && "ring-2 ring-violet-400/60",
              )}
            >
              <p className="line-clamp-2">{card.title}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-violet-300/60">
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
