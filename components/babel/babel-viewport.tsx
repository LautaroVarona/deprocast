"use client";

import { AssaultFeed } from "@/components/babel/assault-feed";
import { ControlBar } from "@/components/babel/control-bar";
import { GridBottomNavWithPlus } from "@/components/grid/grid-bottom-nav";
import { cn } from "@/lib/utils";

export type BabelArea = "campamento" | "trinchera" | "default";

type BabelViewportProps = {
  /** Dentro de Ludus: ocupa el espacio bajo el header y el nav de áreas. */
  embedded?: boolean;
  area?: BabelArea;
};

export function BabelViewport({
  embedded = false,
  area = "default",
}: BabelViewportProps) {
  return (
    <div
      className={cn(
        "babel-noir-root flex flex-col overflow-hidden bg-background text-foreground",
        embedded ? "min-h-0 flex-1" : "h-dvh",
      )}
    >
      <ControlBar area={area} />
      <AssaultFeed area={area} />
      <GridBottomNavWithPlus ludusMode={embedded} />
    </div>
  );
}
