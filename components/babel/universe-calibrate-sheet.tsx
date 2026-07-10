"use client";

import { useBabel } from "@/components/babel/babel-context";
import { WeightSlider } from "@/components/vibe-calibrator/weight-slider";
import {
  Sheet,
  SheetBody,
  SheetHeader,
} from "@/components/ui/sheet";
import type { UniverseDto } from "@/lib/babel/types";
import { toast } from "sonner";

type UniverseCalibrateSheetProps = {
  universe: UniverseDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UniverseCalibrateSheet({
  universe,
  open,
  onOpenChange,
}: UniverseCalibrateSheetProps) {
  const { calibrateUniverse } = useBabel();

  const handleRelease = async (weight: number) => {
    try {
      await calibrateUniverse(universe.slug, weight);
      toast.success(`Universo "${universe.label}" calibrado a ${weight}.`);
      onOpenChange(false);
    } catch {
      toast.error("No se pudo calibrar el universo.");
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-[min(100vw,22rem)]"
    >
      <SheetHeader
        title="Calibrador de Universo"
        onClose={() => onOpenChange(false)}
      />
      <SheetBody>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Prioridad de trinchera para <strong>{universe.label}</strong>. Un peso
            alto proyecta sus asaltos al tope de la jornada.
          </p>
          <WeightSlider
            defaultValue={universe.trenchesWeight ?? 6}
            onRelease={(value) => void handleRelease(value)}
          />
        </div>
      </SheetBody>
    </Sheet>
  );
}
