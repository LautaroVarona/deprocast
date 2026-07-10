"use client";

import { AssaultFeed } from "@/components/babel/assault-feed";
import { BabelProvider } from "@/components/babel/babel-context";
import { ControlBar } from "@/components/babel/control-bar";
import { GridBottomNavWithPlus } from "@/components/grid/grid-bottom-nav";
import { cn } from "@/lib/utils";

type BabelViewportProps = {
  /** Dentro de Ludus: ocupa el espacio bajo el header y el nav de áreas. */
  embedded?: boolean;
};

export function BabelViewport({ embedded = false }: BabelViewportProps) {
  return (
    <BabelProvider>
      <div
        className={cn(
          "babel-noir-root flex flex-col overflow-hidden bg-background text-foreground",
          embedded ? "min-h-0 flex-1" : "h-dvh",
        )}
      >
        <ControlBar />
        <AssaultFeed />
        <GridBottomNavWithPlus ludusMode={embedded} />
      </div>
    </BabelProvider>
  );
}
