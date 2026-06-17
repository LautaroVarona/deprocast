"use client";

import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const WEEKDAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

type MiniCalendarProps = {
  year: number;
  month: number;
  selectedDay: number | null;
  daysWithEntries: number[];
  onMonthChange: (year: number, month: number) => void;
  onDaySelect: (day: number) => void;
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getMondayBasedOffset(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay();
  return firstDay === 0 ? 6 : firstDay - 1;
}

export function MiniCalendar({
  year,
  month,
  selectedDay,
  daysWithEntries,
  onMonthChange,
  onDaySelect,
}: MiniCalendarProps) {
  const monthLabel = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));

  const daysInMonth = getDaysInMonth(year, month);
  const offset = getMondayBasedOffset(year, month);
  const entryDays = new Set(daysWithEntries);

  const goToPreviousMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };

  const goToNextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < offset; i += 1) cells.push({ day: null });
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day });

  return (
    <div className="shrink-0 rounded-lg border border-border bg-muted/20 p-2">
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Mes anterior"
        >
          <ChevronLeftIcon className="size-3.5" />
        </button>
        <p className="font-mono text-[10px] font-medium capitalize tracking-wide">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={goToNextMonth}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Mes siguiente"
        >
          <ChevronRightIcon className="size-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="py-0.5 text-center font-mono text-[9px] text-muted-foreground"
          >
            {label}
          </span>
        ))}

        {cells.map((cell, index) => {
          if (cell.day === null) {
            return <span key={`empty-${index}`} className="h-7" />;
          }

          const hasEntry = entryDays.has(cell.day);
          const isSelected = selectedDay === cell.day;
          const isToday =
            cell.day === new Date().getDate() &&
            month === new Date().getMonth() + 1 &&
            year === new Date().getFullYear();

          return (
            <button
              key={cell.day}
              type="button"
              onClick={() => onDaySelect(cell.day!)}
              className={cn(
                "relative flex h-7 items-center justify-center rounded font-mono text-[10px] transition-all duration-150",
                isSelected
                  ? "bg-primary text-primary-foreground ring-1 ring-primary"
                  : "text-foreground hover:bg-muted/60",
                isToday && !isSelected && "ring-1 ring-border",
              )}
            >
              {cell.day}
              {hasEntry && (
                <span
                  className={cn(
                    "absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
