"use client";

import { AxisSlider } from "@/components/molecular/axis-slider";
import { ParticleTag } from "@/components/molecular/particle-card";
import { Button } from "@/components/ui/button";
import { BLOQUE_COLORS, BLOQUE_GLOW } from "@/lib/jornada/constants";
import { BLOQUE_PRIORIDADES } from "@/lib/jornada/types";
import { computeTaskCurrency } from "@/lib/jornada/utils";
import {
  bloqueToSliderValue,
  sliderValueToBloque,
} from "@/lib/molecular-processing/calibrator";
import type { ParticulaConPropuesta } from "@/lib/molecular-processing/types";
import { cn } from "@/lib/utils";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

type CalibrationRowProps = {
  item: ParticulaConPropuesta;
  index: number;
  validated: boolean;
  disabled: boolean;
  onValidate: (axes: {
    ejeX: ParticulaConPropuesta["propuesta"]["ejeX"];
    ejeY: number;
    ejeZ: number;
  }) => Promise<void>;
};

export function CalibrationRow({
  item,
  index,
  validated,
  disabled,
  onValidate,
}: CalibrationRowProps) {
  const [ejeXValue, setEjeXValue] = useState(
    bloqueToSliderValue(item.propuesta.ejeX),
  );
  const [ejeY, setEjeY] = useState(item.propuesta.ejeY);
  const [ejeZ, setEjeZ] = useState(item.propuesta.ejeZ);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);

  useEffect(() => {
    setEjeXValue(bloqueToSliderValue(item.propuesta.ejeX));
    setEjeY(item.propuesta.ejeY);
    setEjeZ(item.propuesta.ejeZ);
    setShowCurrency(false);
  }, [item]);

  const bloque = sliderValueToBloque(ejeXValue);
  const currency = computeTaskCurrency(ejeY, ejeZ);
  const wasRecalibrated =
    bloque !== item.propuesta.ejeX ||
    ejeY !== item.propuesta.ejeY ||
    ejeZ !== item.propuesta.ejeZ;

  const handleValidate = async () => {
    setIsSubmitting(true);
    await onValidate({ ejeX: bloque, ejeY, ejeZ });
    setShowCurrency(true);
    setIsSubmitting(false);
  };

  return (
    <article
      className={cn(
        "molecular-noir-panel space-y-4 p-4 transition-all duration-500",
        validated && "border-primary/25 bg-primary/[0.04]",
        !validated && wasRecalibrated && "border-accent/20",
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">
              #{String(index + 1).padStart(2, "0")}
            </span>
            <ParticleTag
              label={bloque}
              bloque={bloque}
              className={cn(BLOQUE_COLORS[bloque], BLOQUE_GLOW[bloque])}
            />
            {validated ? (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-primary">
                <CheckIcon className="size-3" />
                Validada
              </span>
            ) : null}
          </div>
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            {item.textoFragmento}
          </p>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            {item.propuesta.razonamiento}
          </p>
        </div>

        {showCurrency || validated ? (
          <div className="molecular-currency-badge shrink-0 text-right">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Currency Potencial
            </p>
            <p className="font-mono text-2xl tabular-nums text-primary">
              {currency.toFixed(2)}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              Y({ejeY}) ÷ Z({ejeZ})
            </p>
          </div>
        ) : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <AxisSlider
          label="Eje X · Esencia"
          sublabel={bloque}
          value={ejeXValue}
          min={1}
          max={6}
          tickLabels={[...BLOQUE_PRIORIDADES]}
          onChange={setEjeXValue}
          disabled={validated || disabled || isSubmitting}
          active={bloque !== item.propuesta.ejeX}
        />
        <AxisSlider
          label="Eje Y · Valor"
          sublabel="Impacto 1–12"
          value={ejeY}
          onChange={setEjeY}
          disabled={validated || disabled || isSubmitting}
          active={ejeY !== item.propuesta.ejeY}
        />
        <AxisSlider
          label="Eje Z · Fricción"
          sublabel="Esfuerzo 1–12"
          value={ejeZ}
          onChange={setEjeZ}
          disabled={validated || disabled || isSubmitting}
          active={ejeZ !== item.propuesta.ejeZ}
        />
      </div>

      {!validated ? (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="font-mono text-[10px] text-muted-foreground">
            Confianza agente:{" "}
            <span className="text-muted-foreground">
              {(item.propuesta.confianza * 100).toFixed(0)}%
            </span>
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleValidate()}
            disabled={disabled || isSubmitting}
            className="bg-primary/80 font-mono text-[10px] uppercase tracking-wider hover:bg-primary/90"
          >
            {isSubmitting ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              "Validar partícula →"
            )}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
