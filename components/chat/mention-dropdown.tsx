"use client";

import { cn } from "@/lib/utils";
import type { MentionSuggestion } from "@/lib/chat/types";

type MentionDropdownProps = {
  suggestions: MentionSuggestion[];
  isLoading: boolean;
  query: string;
  activeIndex: number;
  onSelect: (suggestion: MentionSuggestion) => void;
  onHover: (index: number) => void;
  className?: string;
};

export function MentionDropdown({
  suggestions,
  isLoading,
  query,
  activeIndex,
  onSelect,
  onHover,
  className,
}: MentionDropdownProps) {
  if (!isLoading && suggestions.length === 0 && !query) {
    return null;
  }

  const grouped = suggestions.reduce<Record<string, MentionSuggestion[]>>(
    (acc, suggestion) => {
      const list = acc[suggestion.category] ?? [];
      list.push(suggestion);
      acc[suggestion.category] = list;
      return acc;
    },
    {},
  );

  let globalIndex = -1;

  return (
    <div
      className={cn(
        "absolute bottom-full left-0 z-30 mb-2 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg",
        className,
      )}
    >
      {isLoading ? (
        <div className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
          Buscando…
        </div>
      ) : suggestions.length === 0 ? (
        <div className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
          Sin coincidencias para @{query}
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="border-b border-border px-3 py-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
              {category}
            </div>
            <ul>
              {items.map((suggestion) => {
                globalIndex += 1;
                const index = globalIndex;
                const isActive = index === activeIndex;

                return (
                  <li key={`${suggestion.entityType}:${suggestion.entityId}`}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => onHover(index)}
                      onClick={() => onSelect(suggestion)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left",
                        isActive ? "bg-muted" : "hover:bg-muted/70",
                      )}
                    >
                      <span className="min-w-0 truncate font-mono text-[10px]">
                        @{suggestion.label}
                      </span>
                      {suggestion.subtitle ? (
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {suggestion.subtitle}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
