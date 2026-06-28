"use client";

import { useCastillo } from "@/components/castillo/castillo-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

export function CastilloGridTabs() {
  const { snapshot, activeGridId, isBusy, selectGrid, createGrid } =
    useCastillo();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const grids = snapshot?.grids ?? [];

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createGrid(name);
    setNewName("");
    setIsAdding(false);
  };

  return (
    <div className="shrink-0 border-b border-white/10 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          Grids
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6 text-white/50 hover:bg-white/5 hover:text-white"
          onClick={() => setIsAdding((value) => !value)}
          aria-label="Nuevo grid"
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        {grids.map((grid) => (
          <button
            key={grid.id}
            type="button"
            disabled={isBusy}
            onClick={() => void selectGrid(grid.id)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
              grid.id === activeGridId
                ? "bg-white/10 text-white"
                : "text-white/50 hover:bg-white/5 hover:text-white/80",
            )}
          >
            <span className="font-medium">{grid.name}</span>
            <span className="ml-2 font-mono text-[10px] text-white/30">
              {grid.cardCount}
            </span>
          </button>
        ))}
      </div>

      {isAdding ? (
        <div className="mt-2 flex gap-1">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nombre del grid"
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/30"
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleCreate();
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={() => void handleCreate()}
          >
            OK
          </Button>
        </div>
      ) : null}
    </div>
  );
}
