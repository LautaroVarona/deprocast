import type { BinauralPreset } from "@/lib/binauralizer/types";

export const BINAURAL_PRESETS: BinauralPreset[] = [
  {
    id: "gamma-focus",
    emoji: "🎯",
    label: "Gamma Focus",
    subtitle: "40 Hz — Código denso y resolución de problemas",
    carrierHz: 200,
    beatHz: 40,
  },
  {
    id: "alpha-flow",
    emoji: "🧘",
    label: "Alpha Flow",
    subtitle: "10 Hz — Asimilación de conocimiento y lectura tranquila",
    carrierHz: 180,
    beatHz: 10,
  },
  {
    id: "theta-creative",
    emoji: "🎨",
    label: "Theta Creative",
    subtitle: "6 Hz — Escritura profunda y estados de ideación",
    carrierHz: 160,
    beatHz: 6,
  },
  {
    id: "delta-repair",
    emoji: "💤",
    label: "Delta Deep Repair",
    subtitle: "2 Hz — Descanso y regeneración celular",
    carrierHz: 150,
    beatHz: 2,
  },
];
