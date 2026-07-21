"use client";

import { CastilloCardSurface } from "@/components/castillo/castillo-card";
import { useCastillo } from "@/components/castillo/castillo-context";
import { CASTLE_GRID_COLS, DEFAULT_CARD_LAYOUT } from "@/lib/castillo/constants";
import type { CastleCardDto } from "@/lib/castillo/types";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Layout, LayoutItem } from "react-grid-layout";
import { noCompactor } from "react-grid-layout";
import "react-grid-layout/css/styles.css";

const GridLayout = dynamic(
  () => import("react-grid-layout").then((mod) => mod.default),
  { ssr: false },
);

function toGridLayout(cards: CastleCardDto[]): LayoutItem[] {
  return cards.map((card) => ({
    i: card.id,
    x: card.layout.x,
    y: card.layout.y,
    w: card.layout.w,
    h: card.layout.h,
    minW: DEFAULT_CARD_LAYOUT.minW,
    minH: DEFAULT_CARD_LAYOUT.minH,
  }));
}

export function CastilloCanvas() {
  const { snapshot, isLoading, updateCard } = useCastillo();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  const cards = snapshot?.cards ?? [];

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });

    observer.observe(node);
    setWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => toGridLayout(cards), [cards]);

  const handleLayoutChange = useCallback(
    (nextLayout: Layout) => {
      for (const item of nextLayout) {
        const card = cards.find((entry) => entry.id === item.i);
        if (!card) continue;
        if (
          card.layout.x === item.x &&
          card.layout.y === item.y &&
          card.layout.w === item.w &&
          card.layout.h === item.h
        ) {
          continue;
        }
        void updateCard(card.id, {
          layout: { x: item.x, y: item.y, w: item.w, h: item.h },
        });
      }
    },
    [cards, updateCard],
  );

  return (
    <div ref={containerRef} className="castillo-dot-grid h-full overflow-auto p-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando canvas…</p>
      ) : cards.length === 0 ? (
        <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="max-w-md text-lg font-medium text-muted-foreground">
            A futuristic canvas for your personal development
          </p>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Un lienzo en blanco. Sin preconceptos, solo espacio para que tus
            ideas tomen forma. Arrastrá ítems desde el catálogo lateral.
          </p>
        </div>
      ) : (
        <GridLayout
          className="layout"
          layout={layout}
          width={Math.max(width - 32, 320)}
          gridConfig={{
            cols: CASTLE_GRID_COLS,
            rowHeight: 72,
            margin: [12, 12],
            containerPadding: [0, 0],
          }}
          dragConfig={{
            handle: ".castillo-card-drag-handle",
          }}
          compactor={noCompactor}
          onLayoutChange={handleLayoutChange}
        >
          {cards.map((card) => (
            <div key={card.id} className="castillo-grid-item">
              <div className="castillo-card-drag-handle h-2 cursor-grab rounded-t-xl bg-muted/40 active:cursor-grabbing" />
              <CastilloCardSurface card={card} />
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}
