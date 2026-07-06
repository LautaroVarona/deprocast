"use client";

import { CARRIER_HZ } from "@/lib/trinchera/isochronic/constants";
import type {
  IsochronicParams,
  PulseVisualState,
} from "@/lib/trinchera/isochronic/types";
import { useCallback, useEffect, useRef, useState } from "react";

type IsochronicNodes = {
  carrier: OscillatorNode;
  pulse: OscillatorNode;
  pulseDepth: GainNode;
  dcOffset: ConstantSourceNode;
  outputGain: GainNode;
};

function disconnectNode(node: AudioNode | null | undefined) {
  try {
    node?.disconnect();
  } catch {
    // already disconnected
  }
}

function computePulseVisualState(
  audioTime: number,
  pulseHz: number,
): PulseVisualState {
  const phase = (audioTime * pulseHz) % 1;
  const intensity = phase < 0.5 ? 1 : 0.35;
  return { phase, intensity };
}

export function useIsochronicEngine(initialParams: IsochronicParams) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<IsochronicNodes | null>(null);
  const paramsRef = useRef<IsochronicParams>({ ...initialParams });
  const rafRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [pulseHz, setPulseHzState] = useState(initialParams.pulseHz);
  const [volume, setVolumeState] = useState(initialParams.volume);
  const [pulseVisual, setPulseVisual] = useState<PulseVisualState>({
    phase: 0,
    intensity: 0.35,
  });

  const applyVolumeToNodes = useCallback((value: number) => {
    const nodes = nodesRef.current;
    const ctx = audioContextRef.current;
    if (!nodes || !ctx) return;

    const half = value * 0.5;
    nodes.pulseDepth.gain.setValueAtTime(half, ctx.currentTime);
    nodes.dcOffset.offset.setValueAtTime(half, ctx.currentTime);
  }, []);

  const applyPulseHzToNodes = useCallback((value: number) => {
    const nodes = nodesRef.current;
    const ctx = audioContextRef.current;
    if (!nodes || !ctx) return;

    nodes.pulse.frequency.setValueAtTime(value, ctx.currentTime);
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopRaf();

    const nodes = nodesRef.current;
    if (nodes) {
      try {
        nodes.carrier.stop();
      } catch {
        // already stopped
      }
      try {
        nodes.pulse.stop();
      } catch {
        // already stopped
      }
      try {
        nodes.dcOffset.stop();
      } catch {
        // already stopped
      }

      disconnectNode(nodes.carrier);
      disconnectNode(nodes.pulse);
      disconnectNode(nodes.pulseDepth);
      disconnectNode(nodes.dcOffset);
      disconnectNode(nodes.outputGain);
      nodesRef.current = null;
    }

    setIsPlaying(false);
    setPulseVisual({ phase: 0, intensity: 0.35 });
  }, [stopRaf]);

  const closeContext = useCallback(() => {
    stop();
    const ctx = audioContextRef.current;
    if (ctx && ctx.state !== "closed") {
      void ctx.close().catch(() => {
        // ignore close errors on unmount
      });
    }
    audioContextRef.current = null;
  }, [stop]);

  const ensureContext = useCallback(async () => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return ctx;
  }, []);

  const startVisualSync = useCallback(() => {
    stopRaf();

    const tick = () => {
      const ctx = audioContextRef.current;
      if (!ctx || !nodesRef.current) return;

      setPulseVisual(
        computePulseVisualState(ctx.currentTime, paramsRef.current.pulseHz),
      );
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [stopRaf]);

  const createNodes = useCallback(
    (ctx: AudioContext, params: IsochronicParams) => {
      const carrier = ctx.createOscillator();
      carrier.type = "sawtooth";
      carrier.frequency.value = CARRIER_HZ;

      const pulse = ctx.createOscillator();
      pulse.type = "square";
      pulse.frequency.value = params.pulseHz;

      const pulseDepth = ctx.createGain();
      const halfVolume = params.volume * 0.5;
      pulseDepth.gain.value = halfVolume;

      const dcOffset = ctx.createConstantSource();
      dcOffset.offset.value = halfVolume;

      const outputGain = ctx.createGain();
      outputGain.gain.value = 1;

      carrier.connect(outputGain);
      pulse.connect(pulseDepth);
      pulseDepth.connect(outputGain.gain);
      dcOffset.connect(outputGain.gain);
      outputGain.connect(ctx.destination);

      carrier.start();
      pulse.start();
      dcOffset.start();

      nodesRef.current = {
        carrier,
        pulse,
        pulseDepth,
        dcOffset,
        outputGain,
      };
    },
    [],
  );

  const play = useCallback(async () => {
    stop();

    const ctx = await ensureContext();
    createNodes(ctx, paramsRef.current);
    setIsPlaying(true);
    startVisualSync();
  }, [createNodes, ensureContext, startVisualSync, stop]);

  const setPulseHz = useCallback(
    (value: number) => {
      paramsRef.current = { ...paramsRef.current, pulseHz: value };
      setPulseHzState(value);
      applyPulseHzToNodes(value);
    },
    [applyPulseHzToNodes],
  );

  const setVolume = useCallback(
    (value: number) => {
      paramsRef.current = { ...paramsRef.current, volume: value };
      setVolumeState(value);
      applyVolumeToNodes(value);
    },
    [applyVolumeToNodes],
  );

  useEffect(() => {
    return () => {
      closeContext();
    };
  }, [closeContext]);

  return {
    isPlaying,
    pulseHz,
    volume,
    pulseVisual,
    play,
    stop,
    setPulseHz,
    setVolume,
  };
}
