"use client";

import { useBabel } from "@/components/babel/babel-context";
import { DayNavigator } from "@/components/grid/day-navigator";
import { UniverseSwitcher } from "@/components/babel/universe-switcher";
import type { BabelArea } from "@/components/babel/babel-viewport";

type ControlBarProps = {
  area?: BabelArea;
};

export function ControlBar({ area = "default" }: ControlBarProps) {
  const { selectedDay, setSelectedDay } = useBabel();

  return (
    <header className="shrink-0 border-b border-border">
      {area === "campamento" ? (
        <div className="border-b border-border/60 px-3 py-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400/70">
            Campamento · Beta meso
          </p>
        </div>
      ) : null}
      <UniverseSwitcher />
      {area !== "campamento" ? (
        <DayNavigator selectedDay={selectedDay} onDayChange={setSelectedDay} />
      ) : null}
    </header>
  );
}
