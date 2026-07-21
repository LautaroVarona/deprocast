"use client";

import { ActividadesResumen } from "@/components/grid/actividades-resumen";
import { GridBottomNavWithPlus } from "@/components/grid/grid-bottom-nav";
import { DayNavigator } from "@/components/grid/day-navigator";
import { TrincheraPanel } from "@/components/grid/trinchera-panel";
import type { DayOffset } from "@/lib/pendientes/types";
import { useState } from "react";

export function GridHome() {
  const [selectedDay, setSelectedDay] = useState<DayOffset>("today");

  return (
    <div className="grid-noir-root flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-background text-foreground">
      <DayNavigator selectedDay={selectedDay} onDayChange={setSelectedDay} />
      <TrincheraPanel selectedDay={selectedDay} />
      <ActividadesResumen selectedDay={selectedDay} />
      <GridBottomNavWithPlus />
    </div>
  );
}
