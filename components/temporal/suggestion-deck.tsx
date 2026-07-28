"use client";

import { hermeticDensity, TABLERO_AMBER } from "@/lib/calendario/gravity";
import type { MissionCardDto } from "@/lib/calendario/types";
import {
  ECOSYSTEM_AREAS,
  ECOSYSTEM_AREA_LABELS,
} from "@/lib/calendario/constants";
import type { EcosystemArea } from "@/lib/calendario/constants";
import {
  MISSION_DRAG_TYPE,
  missionDragId,
  type MissionDragData,
} from "@/lib/calendario/dnd";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Loader2Icon } from "lucide-react";

type SuggestionDeckProps = {
  cards: MissionCardDto[];
  isLoading?: boolean;
  selectedCardId?: string | null;
  areaFilter?: EcosystemArea | null;
  onAreaFilterChange?: (area: EcosystemArea | null) => void;
  onSelectCard?: (card: MissionCardDto) => void;
  skin?: "noir" | "ludus";
  draggingCardId?: string | null;
};

function MissionCard({
  card,
  selected,
  onSelect,
  isOverlayDragging,
}: {
  card: MissionCardDto;
  selected: boolean;
  onSelect?: (card: MissionCardDto) => void;
  isOverlayDragging?: boolean;
}) {
  const density = hermeticDensity(card.actionCost);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: missionDragId(card.id),
      data: {
        type: MISSION_DRAG_TYPE,
        card,
      } satisfies MissionDragData,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const energyInMotion = isDragging || isOverlayDragging;

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelect?.(card)}
      className={cn(
        "w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-2 text-left text-xs text-zinc-100 transition-all",
        density.borderWidth,
        density.glow,
        density.inverted && "border-[#FFB000] bg-[#FFB000]/15 text-[#FFB000]",
        selected && "ring-2 ring-[#FFB000]/60",
        energyInMotion &&
          "z-20 cursor-grabbing border-[#FFB000] bg-[#FFB000]/20 opacity-90 shadow-[0_0_28px_rgba(255,176,0,0.55)] ring-2 ring-[#FFB000]/80",
        !energyInMotion && "cursor-grab hover:border-[#FFB000]/50",
        isDragging && "opacity-30",
      )}
    >
      <p className="line-clamp-2">{card.title}</p>
      <p
        className="mt-1 font-mono text-[10px] uppercase tracking-wider"
        style={{ color: energyInMotion ? TABLERO_AMBER : undefined }}
      >
        <span className={cn(!energyInMotion && "text-zinc-500")}>
          G{card.actionCost} · {card.durationMin}m · {density.label}
          {card.ecosystemArea
            ? ` · ${ECOSYSTEM_AREA_LABELS[card.ecosystemArea]}`
            : ""}
        </span>
      </p>
      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-zinc-600">
        {card.source === "microtask"
          ? "Ludus · Trituradora"
          : card.source === "pending_task"
            ? "Pendiente · sin coagular"
            : "Propuesta"}
      </p>
    </button>
  );
}

export function SuggestionDeck({
  cards,
  isLoading = false,
  selectedCardId,
  areaFilter,
  onAreaFilterChange,
  onSelectCard,
  skin = "noir",
  draggingCardId,
}: SuggestionDeckProps) {
  const panelClass =
    skin === "noir"
      ? "border-zinc-800 bg-zinc-950/90"
      : "border-border bg-card/80";

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col rounded-xl border lg:w-72",
        panelClass,
      )}
    >
      <header className="border-b border-zinc-800 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FFB000]/80">
          Mazo de misiones
        </p>
        <p className="text-[11px] text-zinc-500">
          Arrastrá hacia el grid · energía en movimiento
        </p>
      </header>

      {onAreaFilterChange ? (
        <div className="flex flex-wrap gap-1 border-b border-zinc-800 p-2">
          <button
            type="button"
            onClick={() => onAreaFilterChange(null)}
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase",
              !areaFilter
                ? "bg-[#FFB000]/20 text-[#FFB000]"
                : "text-zinc-500 hover:text-zinc-200",
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
                  ? "bg-[#FFB000]/20 text-[#FFB000]"
                  : "text-zinc-500 hover:text-zinc-200",
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
          <p className="p-2 text-xs text-zinc-500">
            Mazo vacío. Forjá microtareas en Trituradora o revisá Pendientes.
          </p>
        ) : (
          cards.map((card) => (
            <MissionCard
              key={card.id}
              card={card}
              selected={selectedCardId === card.id}
              onSelect={onSelectCard}
              isOverlayDragging={draggingCardId === card.id}
            />
          ))
        )}
      </div>
    </aside>
  );
}

/** Overlay visual mientras la carta viaja (brillo ámbar). */
export function MissionCardDragOverlay({ card }: { card: MissionCardDto }) {
  const density = hermeticDensity(card.actionCost);
  return (
    <div
      className={cn(
        "w-64 rounded-md border-2 border-[#FFB000] bg-[#FFB000]/25 px-2.5 py-2 text-left text-xs text-[#FFB000]",
        "shadow-[0_0_32px_rgba(255,176,0,0.65)]",
        density.borderWidth,
      )}
    >
      <p className="line-clamp-2 font-medium">{card.title}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider">
        G{card.actionCost} · coagulación en curso…
      </p>
    </div>
  );
}
