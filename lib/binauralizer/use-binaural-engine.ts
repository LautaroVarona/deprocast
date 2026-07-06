"use client";

import { computeChannelFrequencies } from "@/lib/binauralizer/wave-bands";
import {
  DEFAULT_PARAMS,
  DEFAULT_VOLUME,
  type BinauralParams,
} from "@/lib/binauralizer/types";
import { useCallback, useEffect, useRef, useState } from "react";

type AudioNodes = {
  leftOsc: OscillatorNode;
  rightOsc: OscillatorNode;
  leftPanner: StereoPannerNode;
  rightPanner: StereoPannerNode;
  masterGain: GainNode;
};

function disconnectNode(node: AudioNode | null | undefined) {
  try {
    node?.disconnect();
  } catch {
    // already disconnected
  }
}

export function useBinauralEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNodes | null>(null);
  const paramsRef = useRef<BinauralParams>({ ...DEFAULT_PARAMS });
  const volumeRef = useRef(DEFAULT_VOLUME);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [params, setParams] = useState<BinauralParams>({ ...DEFAULT_PARAMS });

  const applyFrequenciesToNodes = useCallback(
    (carrierHz: number, beatHz: number) => {
      const nodes = nodesRef.current;
      const ctx = audioContextRef.current;
      if (!nodes || !ctx) return;

      const { leftHz, rightHz } = computeChannelFrequencies(carrierHz, beatHz);
      const now = ctx.currentTime;
      nodes.leftOsc.frequency.setValueAtTime(leftHz, now);
      nodes.rightOsc.frequency.setValueAtTime(rightHz, now);
    },
    [],
  );

  const stop = useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes) {
      try {
        nodes.leftOsc.stop();
      } catch {
        // already stopped
      }
      try {
        nodes.rightOsc.stop();
      } catch {
        // already stopped
      }
      disconnectNode(nodes.leftOsc);
      disconnectNode(nodes.rightOsc);
      disconnectNode(nodes.leftPanner);
      disconnectNode(nodes.rightPanner);
      disconnectNode(nodes.masterGain);
      nodesRef.current = null;
    }
    setIsPlaying(false);
  }, []);

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

  const createNodes = useCallback(
    (ctx: AudioContext, carrierHz: number, beatHz: number) => {
      const { leftHz, rightHz } = computeChannelFrequencies(carrierHz, beatHz);

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
      masterGain.gain.value = volumeRef.current;

      leftOsc.connect(leftPanner);
      leftPanner.connect(masterGain);
      rightOsc.connect(rightPanner);
      rightPanner.connect(masterGain);
      masterGain.connect(ctx.destination);

      leftOsc.start();
      rightOsc.start();

      nodesRef.current = {
        leftOsc,
        rightOsc,
        leftPanner,
        rightPanner,
        masterGain,
      };
    },
    [],
  );

  const play = useCallback(
    async (overrides?: Partial<BinauralParams>) => {
      const nextParams: BinauralParams = {
        carrierHz: overrides?.carrierHz ?? paramsRef.current.carrierHz,
        beatHz: overrides?.beatHz ?? paramsRef.current.beatHz,
      };

      paramsRef.current = nextParams;
      setParams(nextParams);

      stop();

      const ctx = await ensureContext();
      createNodes(ctx, nextParams.carrierHz, nextParams.beatHz);
      setIsPlaying(true);
    },
    [createNodes, ensureContext, stop],
  );

  const setVolume = useCallback((value: number) => {
    volumeRef.current = value;
    setVolumeState(value);
    const nodes = nodesRef.current;
    const ctx = audioContextRef.current;
    if (nodes && ctx) {
      nodes.masterGain.gain.setValueAtTime(value, ctx.currentTime);
    }
  }, []);

  const updateFrequencies = useCallback(
    (overrides: Partial<BinauralParams>) => {
      const nextParams: BinauralParams = {
        carrierHz: overrides.carrierHz ?? paramsRef.current.carrierHz,
        beatHz: overrides.beatHz ?? paramsRef.current.beatHz,
      };
      paramsRef.current = nextParams;
      setParams(nextParams);
      applyFrequenciesToNodes(nextParams.carrierHz, nextParams.beatHz);
    },
    [applyFrequenciesToNodes],
  );

  useEffect(() => {
    return () => {
      closeContext();
    };
  }, [closeContext]);

  return {
    isPlaying,
    volume,
    params,
    play,
    stop,
    setVolume,
    updateFrequencies,
  };
}
