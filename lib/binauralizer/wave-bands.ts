import type { WaveBand } from "@/lib/binauralizer/types";

export type WaveBandInfo = {
  band: WaveBand;
  label: string;
  description: string;
  toneClass: string;
};

const BANDS: { max: number; info: WaveBandInfo }[] = [
  {
    max: 3.99,
    info: {
      band: "delta",
      label: "Delta",
      description: "0.5 – 4 Hz · Sueño profundo y reparación",
      toneClass: "border-violet-500/40 bg-violet-500/10 text-violet-200/90",
    },
  },
  {
    max: 7.99,
    info: {
      band: "theta",
      label: "Theta",
      description: "4 – 8 Hz · Creatividad y estados meditativos",
      toneClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200/90",
    },
  },
  {
    max: 12.99,
    info: {
      band: "alpha",
      label: "Alpha",
      description: "8 – 13 Hz · Relajación alerta y flujo",
      toneClass: "border-amber-500/40 bg-amber-500/10 text-amber-200/90",
    },
  },
  {
    max: 29.99,
    info: {
      band: "beta",
      label: "Beta",
      description: "13 – 30 Hz · Concentración y pensamiento activo",
      toneClass: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200/90",
    },
  },
  {
    max: Infinity,
    info: {
      band: "gamma",
      label: "Gamma",
      description: "30 – 50 Hz · Foco intenso y resolución de problemas",
      toneClass: "border-rose-500/40 bg-rose-500/10 text-rose-200/90",
    },
  },
];

export function getWaveBand(beatHz: number): WaveBandInfo {
  for (const entry of BANDS) {
    if (beatHz <= entry.max) {
      return entry.info;
    }
  }
  return BANDS[BANDS.length - 1].info;
}

export function computeChannelFrequencies(
  carrierHz: number,
  beatHz: number,
): { leftHz: number; rightHz: number } {
  const halfBeat = beatHz / 2;
  return {
    leftHz: carrierHz - halfBeat,
    rightHz: carrierHz + halfBeat,
  };
}
