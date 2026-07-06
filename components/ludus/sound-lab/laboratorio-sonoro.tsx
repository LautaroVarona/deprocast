"use client";

import { FocalVisual } from "@/components/ludus/isochronic/focal-visual";
import { IsochronicSlider } from "@/components/ludus/isochronic/isochronic-slider";
import { VisualControls } from "@/components/ludus/isochronic/visual-controls";
import { VolumeDbSlider } from "@/components/ludus/sound-lab/volume-db-slider";
import { useTrincheraSession } from "@/components/ludus/trinchera/trinchera-session-context";
import { Button } from "@/components/ui/button";
import {
  BEAT_MAX,
  BEAT_MIN,
  BREATHING_SEC_MAX,
  BREATHING_SEC_MIN,
  CARRIER_MAX,
  CARRIER_MIN,
  DB_MAX,
  DB_MIN,
  ISO_CARRIER_MAX,
  ISO_CARRIER_MIN,
  MEDITATIVE_BASE_MAX,
  MEDITATIVE_BASE_MIN,
  PULSE_MAX,
  PULSE_MIN,
} from "@/lib/trinchera/sound-lab/constants";
import type { SoundLabMode } from "@/lib/trinchera/sound-lab/types";
import type { TrincheraSnapshot } from "@/lib/ludus/types";
import { buildBackgroundGradient } from "@/lib/trinchera/visual/session-store";
import { cn } from "@/lib/utils";
import {
  BrainIcon,
  Loader2Icon,
  PauseIcon,
  PlayIcon,
  TimerIcon,
  WavesIcon,
  WindIcon,
} from "lucide-react";
import { useCallback } from "react";

const MODE_TABS: {
  id: SoundLabMode;
  label: string;
  icon: typeof WavesIcon;
}[] = [
  { id: "isochronic", label: "Isocrónico", icon: WavesIcon },
  { id: "binaural", label: "Binaural", icon: BrainIcon },
  { id: "meditative", label: "Meditativo", icon: WindIcon },
];

function formatPracticeTime(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

type LaboratorioSonoroProps = {
  snapshot: TrincheraSnapshot;
  className?: string;
};

export function LaboratorioSonoro({
  snapshot,
  className,
}: LaboratorioSonoroProps) {
  const {
    hydrated,
    visual,
    setVisual,
    assaultTitle,
    setAssaultTitle,
    selectedBlock,
    setSelectedBlock,
    selectedMicrotaskId,
    setSelectedMicrotaskId,
    isPlaying,
    isSessionActive,
    isStarting,
    isCompleting,
    params,
    pulseVisual,
    breathingState,
    accumulatedPracticeSec,
    startSession,
    finishSession,
    setMode,
    updateParams,
  } = useTrincheraSession();

  const handleSessionToggle = useCallback(async () => {
    if (isSessionActive) {
      await finishSession(false);
    } else {
      await startSession(snapshot);
    }
  }, [finishSession, isSessionActive, snapshot, startSession]);

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-white/30">
        <Loader2Icon className="size-5 animate-spin" />
      </div>
    );
  }

  const panelStyle = {
    background: buildBackgroundGradient(visual.backgroundColors),
  };

  const canStart = assaultTitle.trim().length > 0 && !isSessionActive;

  return (
    <section
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden",
        className,
      )}
      style={panelStyle}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.15)_2px,rgba(255,255,255,0.15)_3px)]" />

      <header className="relative flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/25 px-4 py-2.5">
        <h2 className="text-base font-semibold text-white">Laboratorio Sonoro</h2>
        <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5">
          <TimerIcon className="size-3.5 text-white/50" />
          <span className="font-mono text-xs font-medium tabular-nums text-white/90">
            {formatPracticeTime(accumulatedPracticeSec)}
          </span>
        </div>
      </header>

      <div className="relative flex shrink-0 gap-1.5 border-b border-white/10 bg-black/20 px-3 py-2">
        {MODE_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            disabled={isSessionActive}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors disabled:opacity-50",
              params.mode === id
                ? "border-white/35 bg-white/15 text-white shadow-sm"
                : "border-white/12 bg-black/30 text-white/60 hover:border-white/20 hover:text-white/85",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="relative grid min-h-0 flex-1 grid-cols-[1fr_11rem] overflow-hidden">
        <div className="relative flex min-h-0 items-center justify-center overflow-hidden px-3 py-2">
          <FocalVisual
            shape={visual.shape}
            motionMode={visual.motionMode}
            figureColors={visual.figureColors}
            backgroundColors={visual.backgroundColors}
            pulseVisual={pulseVisual}
            isPlaying={isPlaying}
            pulseHz={params.mode === "isochronic" ? params.pulseHz : undefined}
            breathingState={
              params.mode === "meditative" ? breathingState : null
            }
            showPulseLabel={
              params.mode === "isochronic" || params.mode === "meditative"
            }
            size="md"
            className="max-h-full max-w-full"
          />
        </div>

        <aside className="min-h-0 overflow-y-auto border-l border-white/10 bg-black/30 px-2.5 py-2">
          <VisualControls visual={visual} onChange={setVisual} />
        </aside>
      </div>

      <footer className="relative shrink-0 space-y-2.5 border-t border-white/10 bg-black/30 px-3 py-3">
        <div className="lab-control-surface space-y-2 rounded-lg p-3">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
            Sesión de asalto
          </p>

          {snapshot.pendingMicrotasks.length > 0 ? (
            <ul className="max-h-20 space-y-1 overflow-y-auto">
              {snapshot.pendingMicrotasks.slice(0, 4).map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    disabled={isSessionActive}
                    onClick={() => {
                      setSelectedMicrotaskId(task.id);
                      setAssaultTitle(task.title);
                    }}
                    className={cn(
                      "w-full rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors disabled:opacity-50",
                      selectedMicrotaskId === task.id
                        ? "border-rose-400/50 bg-rose-500/15 text-white"
                        : "border-white/15 bg-black/40 text-white/75 hover:border-white/25",
                    )}
                  >
                    <span className="line-clamp-1 font-medium">{task.title}</span>
                    <span className="font-mono text-[9px] text-white/45">
                      {task.estimatedMin}m · w{task.baseWeight}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <input
            value={assaultTitle}
            disabled={isSessionActive}
            onChange={(e) => {
              setAssaultTitle(e.target.value);
              setSelectedMicrotaskId(null);
            }}
            placeholder="Título del asalto..."
            className="w-full rounded-md border border-white/20 bg-black/50 px-3 py-2 text-sm font-medium text-white placeholder:text-white/35 focus:border-white/35 focus:outline-none disabled:opacity-50"
          />

          <div className="flex flex-wrap gap-2">
            {snapshot.blockOptions.map((option) => (
              <button
                key={option.minutes}
                type="button"
                disabled={isSessionActive}
                onClick={() => setSelectedBlock(option.minutes)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors disabled:opacity-50",
                  selectedBlock === option.minutes
                    ? "border-rose-400/55 bg-rose-500/20 text-rose-100 shadow-sm"
                    : "border-white/18 bg-black/40 text-white/70 hover:border-white/28 hover:text-white",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lab-control-surface rounded-lg p-3">
          <VolumeDbSlider
            label="Volumen"
            valueDb={params.volumeDb}
            minDb={DB_MIN}
            maxDb={DB_MAX}
            active={isPlaying}
            onChange={(db) => updateParams({ volumeDb: db })}
          />
        </div>

        {params.mode === "isochronic" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="lab-control-surface rounded-lg p-3">
              <IsochronicSlider
                label="Pulsación"
                value={params.pulseHz}
                min={PULSE_MIN}
                max={PULSE_MAX}
                step={0.5}
                unit="Hz"
                active={isPlaying}
                onChange={(v) => updateParams({ pulseHz: v })}
              />
            </div>
            <div className="lab-control-surface rounded-lg p-3">
              <IsochronicSlider
                label="Portador"
                value={params.isochronicCarrierHz}
                min={ISO_CARRIER_MIN}
                max={ISO_CARRIER_MAX}
                step={1}
                unit="Hz"
                active={isPlaying}
                onChange={(v) => updateParams({ isochronicCarrierHz: v })}
              />
            </div>
          </div>
        ) : null}

        {params.mode === "binaural" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="lab-control-surface rounded-lg p-3">
              <IsochronicSlider
                label="Portadora"
                value={params.carrierHz}
                min={CARRIER_MIN}
                max={CARRIER_MAX}
                step={1}
                unit="Hz"
                active={isPlaying}
                onChange={(v) => updateParams({ carrierHz: v })}
              />
            </div>
            <div className="lab-control-surface rounded-lg p-3">
              <IsochronicSlider
                label="Batido"
                value={params.beatHz}
                min={BEAT_MIN}
                max={BEAT_MAX}
                step={0.5}
                unit="Hz"
                active={isPlaying}
                onChange={(v) => updateParams({ beatHz: v })}
              />
            </div>
          </div>
        ) : null}

        {params.mode === "meditative" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="lab-control-surface rounded-lg p-3">
              <IsochronicSlider
                label="Base baja"
                value={params.meditativeBaseHz}
                min={MEDITATIVE_BASE_MIN}
                max={MEDITATIVE_BASE_MAX}
                step={1}
                unit="Hz"
                active={isPlaying}
                onChange={(v) => updateParams({ meditativeBaseHz: v })}
              />
            </div>
            <div className="lab-control-surface rounded-lg p-3">
              <IsochronicSlider
                label="Fase respiración"
                value={params.breathingSecPerPhase}
                min={BREATHING_SEC_MIN}
                max={BREATHING_SEC_MAX}
                step={1}
                unit="s"
                active={isPlaying}
                onChange={(v) => updateParams({ breathingSecPerPhase: v })}
              />
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          disabled={isStarting || isCompleting || (!isSessionActive && !canStart)}
          onClick={() => void handleSessionToggle()}
          className={cn(
            "w-full py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.12em]",
            isSessionActive
              ? "border border-white/25 bg-black/50 text-white hover:bg-black/65"
              : "text-white shadow-lg",
          )}
          style={
            !isSessionActive
              ? {
                  background: `linear-gradient(90deg, ${visual.figureColors.join(", ")})`,
                }
              : undefined
          }
        >
          {isStarting || isCompleting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : isSessionActive ? (
            <>
              <PauseIcon className="size-4" />
              Detener sesión
            </>
          ) : (
            <>
              <PlayIcon className="size-4" />
              Iniciar sesión
            </>
          )}
        </Button>
      </footer>
    </section>
  );
}
