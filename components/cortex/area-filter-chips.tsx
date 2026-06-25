"use client";

import { Button } from "@/components/ui/button";
import { AREA_THEMES } from "@/lib/meta-meteador/area-theme";
import { META_AREAS, type MetaArea } from "@/lib/meta-meteador/types";
import { cn } from "@/lib/utils";

type AreaFilterChipsProps = {
  activeArea: MetaArea | null;
  onAreaChange: (area: MetaArea | null) => void;
  counts?: Partial<Record<MetaArea, number>>;
};

export function AreaFilterChips({
  activeArea,
  onAreaChange,
  counts,
}: AreaFilterChipsProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="toolbar"
      aria-label="Filtros por área semántica"
    >
      <Button
        type="button"
        size="sm"
        variant={activeArea === null ? "default" : "outline"}
        className="h-8 rounded-full px-3 text-xs"
        onClick={() => onAreaChange(null)}
      >
        Todos
      </Button>
      {META_AREAS.map((area) => {
        const theme = AREA_THEMES[area];
        const Icon = theme.icon;
        const isActive = activeArea === area;
        const count = counts?.[area];

        return (
          <Button
            key={area}
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "h-8 gap-1.5 rounded-full border px-3 text-xs transition-colors",
              isActive
                ? cn(theme.chipClass, theme.borderClass, "font-semibold")
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onAreaChange(isActive ? null : area)}
            aria-pressed={isActive}
          >
            <Icon className="size-3.5" aria-hidden />
            {theme.label}
            {count !== undefined && count > 0 && (
              <span className="tabular-nums opacity-70">({count})</span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
