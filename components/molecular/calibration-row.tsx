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
        validated && "border-emerald-500/25 bg-emerald-500/[0.04]",
        !validated && wasRecalibrated && "border-amber-500/20",
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-white/30">
              #{String(index + 1).padStart(2, "0")}
            </span>
            <ParticleTag
              label={bloque}
              bloque={bloque}
              className={cn(BLOQUE_COLORS[bloque], BLOQUE_GLOW[bloque])}
            />
            {validated ? (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                <CheckIcon className="size-3" />
                Validada
              </span>
            ) : null}
          </div>
          <p className="font-mono text-xs leading-relaxed text-white/75">
            {item.textoFragmento}
          </p>
          <p className="font-mono text-[9px] leading-relaxed text-white/25">
            {item.propuesta.razonamiento}
          </p>
        </div>

        {showCurrency || validated ? (
          <div className="molecular-currency-badge shrink-0 text-right">
            <p className="font-mono text-[9px] uppercase tracking-wider text-white/35">
              Currency Potencial
            </p>
            <p className="font-mono text-2xl tabular-nums text-emerald-300">
              {currency.toFixed(2)}
            </p>
            <p className="font-mono text-[9px] text-white/30">
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
        <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3">
          <span className="font-mono text-[10px] text-white/30">
            Confianza agente:{" "}
            <span className="text-white/50">
              {(item.propuesta.confianza * 100).toFixed(0)}%
            </span>
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleValidate()}
            disabled={disabled || isSubmitting}
            className="bg-emerald-600/80 font-mono text-[10px] uppercase tracking-wider hover:bg-emerald-500/90"
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
