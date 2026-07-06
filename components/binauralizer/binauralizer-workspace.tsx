"use client";

import { CustomControls } from "@/components/binauralizer/custom-controls";
import { EducationalCard } from "@/components/binauralizer/educational-card";
import { PresetButtons } from "@/components/binauralizer/preset-buttons";
import type { BinauralPreset } from "@/lib/binauralizer/types";
import { useBinauralEngine } from "@/lib/binauralizer/use-binaural-engine";
import { WavesIcon } from "lucide-react";
import { useCallback, useState } from "react";

export function BinauralizerWorkspace() {
  const {
    isPlaying,
    volume,
    params,
    play,
    stop,
    setVolume,
    updateFrequencies,
  } = useBinauralEngine();

  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const handleSelectPreset = useCallback(
    async (preset: BinauralPreset) => {
      setActivePresetId(preset.id);
      await play({
        carrierHz: preset.carrierHz,
        beatHz: preset.beatHz,
      });
    },
    [play],
  );

  const handleCarrierChange = useCallback(
    (value: number) => {
      setActivePresetId(null);
      updateFrequencies({ carrierHz: value });
    },
    [updateFrequencies],
  );

  const handleBeatChange = useCallback(
    (value: number) => {
      setActivePresetId(null);
      updateFrequencies({ beatHz: value });
    },
    [updateFrequencies],
  );

  const handlePlay = useCallback(async () => {
    await play();
  }, [play]);

  return (
    <div className="binauralizer-noir-root mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <WavesIcon className="size-5 text-amber-400/70" />
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
                Binauralizer
              </p>
            </div>
            <h1 className="bg-gradient-to-r from-amber-100 via-amber-50/90 to-emerald-100/60 bg-clip-text font-mono text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
              Sintonía cognitiva en tiempo real
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-white/45">
              Generador local de tonos binaurales para modular tu estado mental.
              Elegí un preset cognitivo o ajustá portadora y frecuencia de
              destino con precisión quirúrgica.
            </p>
          </div>

          {isPlaying ? (
            <span className="flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-200/80">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              Sesión activa
            </span>
          ) : (
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-200/80">
              Listo para iniciar
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="flex flex-col gap-4">
          <section className="binauralizer-noir-panel space-y-4 p-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber-400/60">
                01 · Presets cognitivos
              </p>
              <h2 className="mt-1 font-mono text-sm font-medium text-white/90">
                Estados mentales prefabricados
              </h2>
              <p className="mt-1 text-xs text-white/45">
                Un clic activa portadora y frecuencia binaural optimizadas.
              </p>
            </div>
            <PresetButtons
              activePresetId={activePresetId}
              onSelectPreset={handleSelectPreset}
            />
          </section>

          <section className="binauralizer-noir-panel space-y-4 p-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber-400/60">
                02 · Ajuste manual
              </p>
              <h2 className="mt-1 font-mono text-sm font-medium text-white/90">
                Herramientas custom
              </h2>
              <p className="mt-1 text-xs text-white/45">
                Personalizá portadora, beat y volumen. Los cambios se aplican en
                vivo si la sesión está activa.
              </p>
            </div>
            <CustomControls
              params={params}
              isPlaying={isPlaying}
              volume={volume}
              onCarrierChange={handleCarrierChange}
              onBeatChange={handleBeatChange}
              onVolumeChange={setVolume}
              onPlay={handlePlay}
              onStop={stop}
            />
          </section>
        </div>

        <section className="binauralizer-noir-panel space-y-4 p-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber-400/60">
              03 · Ciencia
            </p>
            <h2 className="mt-1 font-mono text-sm font-medium text-white/90">
              Cómo funcionan los tonos binaurales
            </h2>
          </div>
          <EducationalCard />
        </section>
      </div>
    </div>
  );
}
