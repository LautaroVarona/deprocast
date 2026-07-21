"use client";

import { useEffect } from "react";
import type { CalendarViewMode } from "@/components/temporal/view-mode-switch";
import type { MissionCardDto } from "@/lib/calendario/types";
import type { TemporalBlock } from "@/lib/temporal/types";
import type { EcosystemArea } from "@/lib/calendario/constants";

type CalendarioKeyboardOptions = {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  selectedCard: MissionCardDto | null;
  selectedBlock: TemporalBlock | null;
  onCoagulate: () => void;
  onSkipRoutine: () => void;
  onConfirmRoutine: () => void;
  areaFilter: EcosystemArea | null;
  onAreaFilterChange: (area: EcosystemArea | null) => void;
  enabled?: boolean;
};

const AREA_KEYS: Record<string, EcosystemArea> = {
  l: "legal",
  s: "salud",
  f: "finanzas",
  t: "tecnologia",
  a: "arte",
  m: "meta",
};

export function useCalendarioKeyboard({
  viewMode,
  onViewModeChange,
  selectedCard,
  selectedBlock,
  onCoagulate,
  onSkipRoutine,
  onConfirmRoutine,
  areaFilter,
  onAreaFilterChange,
  enabled = true,
}: CalendarioKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        onViewModeChange("month");
        return;
      }
      if (event.key === "2") {
        event.preventDefault();
        onViewModeChange("week");
        return;
      }
      if (event.key === "3") {
        event.preventDefault();
        onViewModeChange("day");
        return;
      }

      if (event.key === "Enter" && selectedCard) {
        event.preventDefault();
        onCoagulate();
        return;
      }

      if (event.key === "s" || event.key === "S") {
        if (selectedBlock?.blockKind === "ROUTINE") {
          event.preventDefault();
          onSkipRoutine();
        }
        return;
      }

      if (event.key === "c" || event.key === "C") {
        if (selectedBlock?.blockKind === "ROUTINE") {
          event.preventDefault();
          onConfirmRoutine();
        }
        return;
      }

      if (event.key === "Escape") {
        onAreaFilterChange(null);
        return;
      }

      if (event.shiftKey && AREA_KEYS[event.key.toLowerCase()]) {
        event.preventDefault();
        const next = AREA_KEYS[event.key.toLowerCase()];
        onAreaFilterChange(areaFilter === next ? null : next);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    enabled,
    viewMode,
    onViewModeChange,
    selectedCard,
    selectedBlock,
    onCoagulate,
    onSkipRoutine,
    onConfirmRoutine,
    areaFilter,
    onAreaFilterChange,
  ]);
}
