"use client";

import {
  getOndaShortLabel,
  ONDA_BADGE_STYLES,
} from "@/components/diario/constants";
import { MiniCalendar } from "@/components/diario/mini-calendar";
import { Badge } from "@/components/ui/badge";
import type { JournalEntrySummary } from "@/lib/journal/types";
import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";

type JournalSidebarProps = {
  year: number;
  month: number;
  selectedDay: number | null;
  daysWithEntries: number[];
  entries: JournalEntrySummary[];
  selectedEntryId: string | null;
  searchQuery: string;
  isLoading: boolean;
  onMonthChange: (year: number, month: number) => void;
  onDaySelect: (day: number | null) => void;
  onSearchChange: (query: string) => void;
  onEntrySelect: (entry: JournalEntrySummary) => void;
};

export function JournalSidebar({
  year,
  month,
  selectedDay,
  daysWithEntries,
  entries,
  selectedEntryId,
  searchQuery,
  isLoading,
  onMonthChange,
  onDaySelect,
  onSearchChange,
  onEntrySelect,
}: JournalSidebarProps) {
  const filteredByDay =
    selectedDay === null
      ? entries
      : entries.filter((entry) => entry.day === selectedDay);

  return (
    <aside className="flex w-[30%] min-w-[220px] max-w-sm shrink-0 flex-col border-r border-border bg-muted/10">
      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
            Memoria · Gnosis
          </p>
          <h1 className="text-sm font-semibold">Diario de Gnosis</h1>
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar en el mes…"
            className="w-full rounded-md border border-input bg-background py-1.5 pr-2 pl-8 font-mono text-[11px] outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>

        <MiniCalendar
          year={year}
          month={month}
          selectedDay={selectedDay}
          daysWithEntries={daysWithEntries}
          onMonthChange={(nextYear, nextMonth) => {
            onMonthChange(nextYear, nextMonth);
            onDaySelect(null);
          }}
          onDaySelect={(day) =>
            onDaySelect(selectedDay === day ? null : day)
          }
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <p className="px-2 py-4 text-center font-mono text-[10px] text-muted-foreground">
            Sincronizando entradas…
          </p>
        ) : filteredByDay.length === 0 ? (
          <p className="px-2 py-4 text-center font-mono text-[10px] text-muted-foreground">
            {searchQuery || selectedDay
              ? "Sin coincidencias en este filtro."
              : "Aún no hay registros este mes."}
          </p>
        ) : (
          <ul className="space-y-1">
            {filteredByDay.map((entry) => {
              const isActive = selectedEntryId === entry.id;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => onEntrySelect(entry)}
                    className={cn(
                      "w-full rounded-lg border px-2.5 py-2 text-left transition-colors duration-150",
                      isActive
                        ? "border-primary/40 bg-primary/10"
                        : "border-transparent hover:bg-muted/50",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {entry.fechaRegistro.slice(0, 16)}
                      </span>
                      <Badge
                        className={cn(
                          "h-4 shrink-0 px-1.5 text-[8px] font-medium",
                          ONDA_BADGE_STYLES[entry.onda],
                        )}
                      >
                        {getOndaShortLabel(entry.onda)}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 font-mono text-[10px] leading-snug text-foreground/90">
                      {entry.previewLines.join(" · ") || entry.title}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
