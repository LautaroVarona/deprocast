"use client";

import { computeChannelFrequencies } from "@/lib/binauralizer/wave-bands";
import { DEFAULT_SOUND_LAB_PARAMS } from "@/lib/trinchera/sound-lab/constants";
import { dbToGain } from "@/lib/trinchera/sound-lab/session-store";
import type {
  BreathingPhase,
  BreathingState,
  PulseVisualState,
  SoundLabMode,
  SoundLabParams,
} from "@/lib/trinchera/sound-lab/types";
import { useCallback, useEffect, useRef, useState } from "react";

function disconnectNode(node: AudioNode | null | undefined) {
  try {
    node?.disconnect();
  } catch {
    // already disconnected
  }
}

function computePulseVisual(audioTime: number, pulseHz: number): PulseVisualState {
  const phase = (audioTime * pulseHz) % 1;
  const intensity = phase < 0.5 ? 1 : 0.35;
  return { phase, intensity };
}

function computeBreathingState(
  elapsedSec: number,
  secPerPhase: number,
): BreathingState {
  const cycleSec = secPerPhase * 4;
  const inCycle = elapsedSec % cycleSec;
  const phaseIndex = Math.floor(inCycle / secPerPhase);
  const phaseProgress = (inCycle % secPerPhase) / secPerPhase;
  const phases: BreathingPhase[] = [
    "inhale",
    "hold-in",
    "exhale",
    "hold-out",
  ];
  const phase = phases[phaseIndex] ?? "inhale";

  let scale = 1;
  if (phase === "inhale") scale = 0.82 + phaseProgress * 0.18;
  else if (phase === "hold-in") scale = 1;
  else if (phase === "exhale") scale = 1 - phaseProgress * 0.18;
  else scale = 0.82;

  return {
    phase,
    phaseProgress,
    cycleProgress: inCycle / cycleSec,
    scale,
    secondsLeft: Math.ceil(secPerPhase - (inCycle % secPerPhase)),
  };
}

type ActiveNodes =
  | {
      mode: "isochronic";
      carrier: OscillatorNode;
      pulse: OscillatorNode;
      pulseDepth: GainNode;
      dcOffset: ConstantSourceNode;
      masterGain: GainNode;
    }
  | {
      mode: "binaural";
      leftOsc: OscillatorNode;
      rightOsc: OscillatorNode;
      masterGain: GainNode;
    }
  | {
      mode: "meditative";
      leftOsc: OscillatorNode;
      rightOsc: OscillatorNode;
      masterGain: GainNode;
    };

export function useSoundLabEngine(
  initial: SoundLabParams = DEFAULT_SOUND_LAB_PARAMS,
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<ActiveNodes | null>(null);
  const paramsRef = useRef<SoundLabParams>({ ...initial });
  const isPlayingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const breathingStartRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [params, setParamsState] = useState<SoundLabParams>({ ...initial });
  const [pulseVisual, setPulseVisual] = useState<PulseVisualState>({
    phase: 0,
    intensity: 0.35,
  });
  const [breathingState, setBreathingState] = useState<BreathingState | null>(
    null,
  );

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const teardownNodes = useCallback(() => {
    const nodes = nodesRef.current;
    if (!nodes) return;

    if (nodes.mode === "isochronic") {
      try { nodes.carrier.stop(); } catch { /* */ }
      try { nodes.pulse.stop(); } catch { /* */ }
      try { nodes.dcOffset.stop(); } catch { /* */ }
      disconnectNode(nodes.carrier);
      disconnectNode(nodes.pulse);
      disconnectNode(nodes.pulseDepth);
      disconnectNode(nodes.dcOffset);
      disconnectNode(nodes.masterGain);
    } else {
      try { nodes.leftOsc.stop(); } catch { /* */ }
      try { nodes.rightOsc.stop(); } catch { /* */ }
      disconnectNode(nodes.leftOsc);
      disconnectNode(nodes.rightOsc);
      disconnectNode(nodes.masterGain);
    }
    nodesRef.current = null;
  }, []);

  const stop = useCallback(() => {
    stopRaf();
    breathingStartRef.current = null;
    teardownNodes();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setPulseVisual({ phase: 0, intensity: 0.35 });
    setBreathingState(null);
  }, [stopRaf, teardownNodes]);

  const closeContext = useCallback(() => {
    stop();
    const ctx = audioContextRef.current;
    if (ctx && ctx.state !== "closed") void ctx.close().catch(() => {});
    audioContextRef.current = null;
  }, [stop]);

  const ensureContext = useCallback(async () => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") await ctx.resume();
    return ctx;
  }, []);

  const startIsochronicSync = useCallback(() => {
    stopRaf();
    const tick = () => {
      const ctx = audioContextRef.current;
      if (!ctx || !nodesRef.current) return;
      setPulseVisual(
        computePulseVisual(ctx.currentTime, paramsRef.current.pulseHz),
      );
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopRaf]);

  const startBreathingSync = useCallback(() => {
    stopRaf();
    breathingStartRef.current = performance.now() / 1000;
    const tick = () => {
      if (breathingStartRef.current === null) return;
      const elapsed = performance.now() / 1000 - breathingStartRef.current;
      setBreathingState(
        computeBreathingState(elapsed, paramsRef.current.breathingSecPerPhase),
      );
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopRaf]);

  const createIsochronicNodes = useCallback((ctx: AudioContext, p: SoundLabParams) => {
    const carrier = ctx.createOscillator();
    carrier.type = "sine";
    carrier.frequency.value = p.isochronicCarrierHz;

    const pulse = ctx.createOscillator();
    pulse.type = "square";
    pulse.frequency.value = p.pulseHz;

    const half = dbToGain(p.volumeDb) * 0.5;
    const pulseDepth = ctx.createGain();
    pulseDepth.gain.value = half;

    const dcOffset = ctx.createConstantSource();
    dcOffset.offset.value = half;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;

    carrier.connect(masterGain);
    pulse.connect(pulseDepth);
    pulseDepth.connect(masterGain.gain);
    dcOffset.connect(masterGain.gain);
    masterGain.connect(ctx.destination);

    carrier.start();
    pulse.start();
    dcOffset.start();

    nodesRef.current = {
      mode: "isochronic",
      carrier,
      pulse,
      pulseDepth,
      dcOffset,
      masterGain,
    };
  }, []);

  const createBinauralNodes = useCallback((ctx: AudioContext, p: SoundLabParams) => {
    const { leftHz, rightHz } = computeChannelFrequencies(p.carrierHz, p.beatHz);

    const leftOsc = ctx.createOscillator();
    leftOsc.type = "sine";
    leftOsc.frequency.value = leftHz;

    const rightOsc = ctx.createOscillator();
    rightOsc.type = "sine";
    rightOsc.frequency.value = rightHz;

    const leftPanner = ctx.createStereoPanner();
    leftPanner.pan.value = -1;
    const rightPanner = ctx.createStereoPanner();
    rightPanner.pan.value = 1;

    const masterGain = ctx.createGain();
    masterGain.gain.value = dbToGain(p.volumeDb);

    leftOsc.connect(leftPanner);
    leftPanner.connect(masterGain);
    rightOsc.connect(rightPanner);
    rightPanner.connect(masterGain);
    masterGain.connect(ctx.destination);

    leftOsc.start();
    rightOsc.start();

    nodesRef.current = { mode: "binaural", leftOsc, rightOsc, masterGain };
  }, []);

  const createMeditativeNodes = useCallback((ctx: AudioContext, p: SoundLabParams) => {
    const leftOsc = ctx.createOscillator();
    leftOsc.type = "sine";
    leftOsc.frequency.value = p.meditativeBaseHz;

    const rightOsc = ctx.createOscillator();
    rightOsc.type = "sine";
    rightOsc.frequency.value = p.meditativeBaseHz * 1.5;

    const leftPanner = ctx.createStereoPanner();
    leftPanner.pan.value = -0.6;
    const rightPanner = ctx.createStereoPanner();
    rightPanner.pan.value = 0.6;

    const masterGain = ctx.createGain();
    masterGain.gain.value = dbToGain(p.volumeDb);

    leftOsc.connect(leftPanner);
    leftPanner.connect(masterGain);
    rightOsc.connect(rightPanner);
    rightPanner.connect(masterGain);
    masterGain.connect(ctx.destination);

    leftOsc.start();
    rightOsc.start();

    nodesRef.current = { mode: "meditative", leftOsc, rightOsc, masterGain };
  }, []);

  const play = useCallback(
    async (modeOverride?: SoundLabMode) => {
      stop();
      const mode = modeOverride ?? paramsRef.current.mode;
      const ctx = await ensureContext();

      if (mode === "isochronic") {
        createIsochronicNodes(ctx, paramsRef.current);
        startIsochronicSync();
      } else if (mode === "binaural") {
        createBinauralNodes(ctx, paramsRef.current);
        setPulseVisual({ phase: 0, intensity: 0.6 });
      } else {
        createMeditativeNodes(ctx, paramsRef.current);
        startBreathingSync();
      }

      isPlayingRef.current = true;
      setIsPlaying(true);
    },
    [
      createBinauralNodes,
      createIsochronicNodes,
      createMeditativeNodes,
      ensureContext,
      startBreathingSync,
      startIsochronicSync,
      stop,
    ],
  );

  const applyLiveParams = useCallback((next: SoundLabParams, patch: Partial<SoundLabParams>) => {
    const ctx = audioContextRef.current;
    const nodes = nodesRef.current;
    if (!ctx || !nodes || !isPlayingRef.current) return;

    if (patch.volumeDb !== undefined) {
      const gain = dbToGain(next.volumeDb);
      if (nodes.mode === "isochronic") {
        const half = gain * 0.5;
        nodes.pulseDepth.gain.setValueAtTime(half, ctx.currentTime);
        nodes.dcOffset.offset.setValueAtTime(half, ctx.currentTime);
      } else {
        nodes.masterGain.gain.setValueAtTime(gain, ctx.currentTime);
      }
    }

    if (nodes.mode === "isochronic") {
      if (patch.pulseHz !== undefined) {
        nodes.pulse.frequency.setValueAtTime(patch.pulseHz, ctx.currentTime);
      }
      if (patch.isochronicCarrierHz !== undefined) {
        nodes.carrier.frequency.setValueAtTime(
          patch.isochronicCarrierHz,
          ctx.currentTime,
        );
      }
    }

    if (nodes.mode === "binaural" && (patch.carrierHz !== undefined || patch.beatHz !== undefined)) {
      const { leftHz, rightHz } = computeChannelFrequencies(next.carrierHz, next.beatHz);
      nodes.leftOsc.frequency.setValueAtTime(leftHz, ctx.currentTime);
      nodes.rightOsc.frequency.setValueAtTime(rightHz, ctx.currentTime);
    }

    if (nodes.mode === "meditative" && patch.meditativeBaseHz !== undefined) {
      nodes.leftOsc.frequency.setValueAtTime(patch.meditativeBaseHz, ctx.currentTime);
      nodes.rightOsc.frequency.setValueAtTime(
        patch.meditativeBaseHz * 1.5,
        ctx.currentTime,
      );
    }
  }, []);

  const updateParams = useCallback(
    (patch: Partial<SoundLabParams>) => {
      const next = { ...paramsRef.current, ...patch };
      paramsRef.current = next;
      setParamsState(next);
      applyLiveParams(next, patch);
    },
    [applyLiveParams],
  );

  const setMode = useCallback(
    (mode: SoundLabMode) => {
      const wasPlaying = isPlayingRef.current;
      updateParams({ mode });
      if (wasPlaying) void play(mode);
    },
    [play, updateParams],
  );

  useEffect(() => () => closeContext(), [closeContext]);

  return {
    isPlaying,
    params,
    pulseVisual,
    breathingState,
    play,
    stop,
    setMode,
    updateParams,
  };
}
