"use client";

import { useBabel } from "@/components/babel/babel-context";
import { DayNavigator } from "@/components/grid/day-navigator";
import { UniverseSwitcher } from "@/components/babel/universe-switcher";

export function ControlBar() {
  const { selectedDay, setSelectedDay } = useBabel();

  return (
    <header className="shrink-0 border-b border-border">
      <UniverseSwitcher />
      <DayNavigator selectedDay={selectedDay} onDayChange={setSelectedDay} />
    </header>
  );
}
