"use client";

import { MAX_PALETTE_COLORS } from "@/lib/trinchera/visual/defaults";
import {
  FOCAL_SHAPE_LABELS,
  type FocalShape,
  type MotionMode,
  type TrincheraVisualPrefs,
} from "@/lib/trinchera/visual/types";
import { cn } from "@/lib/utils";
import { MinusIcon, PlusIcon } from "lucide-react";

type VisualControlsProps = {
  visual: TrincheraVisualPrefs;
  onChange: (visual: TrincheraVisualPrefs) => void;
  className?: string;
};

const SHAPES = Object.keys(FOCAL_SHAPE_LABELS) as FocalShape[];

import type { ReactNode } from "react";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </p>
  );
}

function ColorPaletteEditor({
  label,
  colors,
  onChange,
}: {
  label: string;
  colors: string[];
  onChange: (colors: string[]) => void;
}) {
  const updateColor = (index: number, value: string) => {
    const next = [...colors];
    next[index] = value;
    onChange(next);
  };

  const addColor = () => {
    if (colors.length >= MAX_PALETTE_COLORS) return;
    onChange([...colors, colors[colors.length - 1] ?? "#ffffff"]);
  };

  const removeColor = (index: number) => {
    if (colors.length <= 1) return;
    onChange(colors.filter((_, i) => i !== index));
  };

  return (
    <div className="lab-control-surface space-y-2 rounded-lg p-2.5">
      <div className="flex items-center justify-between">
        <SectionLabel>{label}</SectionLabel>
        <button
          type="button"
          onClick={addColor}
          disabled={colors.length >= MAX_PALETTE_COLORS}
          className="rounded-md border border-border bg-muted/40 p-1 text-muted-foreground hover:bg-muted/50 disabled:opacity-30"
          aria-label={`Agregar color a ${label}`}
        >
          <PlusIcon className="size-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {colors.map((color, index) => (
          <div key={`${label}-${index}`} className="flex items-center gap-1">
            <label className="relative block size-8 cursor-pointer overflow-hidden rounded-md border-2 border-border shadow-sm">
              <input
                type="color"
                value={color}
                onChange={(e) => updateColor(index, e.target.value)}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
              <span
                className="block size-full"
                style={{ backgroundColor: color }}
              />
            </label>
            {colors.length > 1 ? (
              <button
                type="button"
                onClick={() => removeColor(index)}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                aria-label="Quitar color"
              >
                <MinusIcon className="size-3.5" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function VisualControls({
  visual,
  onChange,
  className,
}: VisualControlsProps) {
  const setMotion = (motionMode: MotionMode) => {
    onChange({ ...visual, motionMode });
  };

  const setShape = (shape: FocalShape) => {
    onChange({ ...visual, shape });
  };

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="lab-control-surface space-y-2 rounded-lg p-2.5">
        <SectionLabel>Figura</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {SHAPES.map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => setShape(shape)}
              className={cn(
                "rounded-md border px-2.5 py-1.5 font-mono text-[10px] font-medium transition-colors",
                visual.shape === shape
                  ? "border-border bg-muted/40 text-foreground shadow-sm"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {FOCAL_SHAPE_LABELS[shape]}
            </button>
          ))}
        </div>
      </div>

      <div className="lab-control-surface space-y-2 rounded-lg p-2.5">
        <SectionLabel>Movimiento</SectionLabel>
        <div className="flex gap-1.5">
          {(["fixed", "drift"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMotion(mode)}
              className={cn(
                "flex-1 rounded-md border py-2 font-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-colors",
                visual.motionMode === mode
                  ? "border-border bg-muted/40 text-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-border",
              )}
            >
              {mode === "fixed" ? "Fija" : "Flotante"}
            </button>
          ))}
        </div>
      </div>

      <ColorPaletteEditor
        label="Fondo"
        colors={visual.backgroundColors}
        onChange={(backgroundColors) =>
          onChange({ ...visual, backgroundColors })
        }
      />

      <ColorPaletteEditor
        label="Figura"
        colors={visual.figureColors}
        onChange={(figureColors) => onChange({ ...visual, figureColors })}
      />
    </div>
  );
}
