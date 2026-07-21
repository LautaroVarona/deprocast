"use client";

import { BinauralSlider } from "@/components/binauralizer/binaural-slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BEAT_MAX,
  BEAT_MIN,
  CARRIER_MAX,
  CARRIER_MIN,
  VOLUME_MAX,
  VOLUME_MIN,
  type BinauralParams,
} from "@/lib/binauralizer/types";
import {
  computeChannelFrequencies,
  getWaveBand,
} from "@/lib/binauralizer/wave-bands";
import { cn } from "@/lib/utils";
import { PauseIcon, PlayIcon } from "lucide-react";

type CustomControlsProps = {
  params: BinauralParams;
  isPlaying: boolean;
  volume: number;
  onCarrierChange: (value: number) => void;
  onBeatChange: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onPlay: () => void;
  onStop: () => void;
};

export function CustomControls({
  params,
  isPlaying,
  volume,
  onCarrierChange,
  onBeatChange,
  onVolumeChange,
  onPlay,
  onStop,
}: CustomControlsProps) {
  const waveBand = getWaveBand(params.beatHz);
  const { leftHz, rightHz } = computeChannelFrequencies(
    params.carrierHz,
    params.beatHz,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge
          variant="outline"
          className={cn(
            "rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider",
            waveBand.toneClass,
          )}
        >
          {waveBand.label} · {waveBand.description}
        </Badge>

        <div className="flex items-center gap-2">
          {isPlaying ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onStop}
              className="border-border bg-transparent font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:border-destructive/30 hover:text-destructive"
            >
              <PauseIcon className="size-3.5" />
              Detener
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={onPlay}
              className="bg-accent/90 font-mono text-[10px] uppercase tracking-wider text-black hover:bg-accent/20"
            >
              <PlayIcon className="size-3.5" />
              Reproducir
            </Button>
          )}
          {isPlaying ? (
            <span className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary/80">
              <span className="size-1.5 animate-pulse rounded-full bg-primary/20" />
              Activo
            </span>
          ) : null}
        </div>
      </div>

      <BinauralSlider
        label="Frecuencia base / portadora"
        sublabel="Tono central simétrico entre ambos canales"
        value={params.carrierHz}
        min={CARRIER_MIN}
        max={CARRIER_MAX}
        step={1}
        onChange={onCarrierChange}
        active={isPlaying}
      />

      <BinauralSlider
        label="Frecuencia binaural de destino"
        sublabel="Diferencia entre oído izquierdo y derecho"
        value={params.beatHz}
        min={BEAT_MIN}
        max={BEAT_MAX}
        step={0.5}
        onChange={onBeatChange}
        active={isPlaying}
      />

      <BinauralSlider
        label="Volumen maestro"
        sublabel="Nivel seguro por defecto — subir con precaución"
        value={volume}
        min={VOLUME_MIN}
        max={VOLUME_MAX}
        step={0.01}
        unit=""
        onChange={onVolumeChange}
        active={isPlaying}
      />

      <div className="rounded-lg border border-border bg-card/80 px-4 py-3 font-mono text-xs tabular-nums text-muted-foreground">
        <span className="text-muted-foreground">L:</span> {leftHz.toFixed(1)} Hz
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="text-muted-foreground">R:</span> {rightHz.toFixed(1)} Hz
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="text-muted-foreground">Δ:</span> {params.beatHz.toFixed(1)} Hz
      </div>
    </div>
  );
}
