import type { TrincheraLocalSession, TrincheraVisualPrefs } from "@/lib/trinchera/visual/types";

export const DEFAULT_VISUAL_PREFS: TrincheraVisualPrefs = {
  shape: "hexagon",
  motionMode: "fixed",
  backgroundColors: ["#030304", "#0a0508"],
  figureColors: ["#f43f5e", "#fb7185", "#fda4af"],
};

export const DEFAULT_TRINCHERA_LOCAL: TrincheraLocalSession = {
  visual: DEFAULT_VISUAL_PREFS,
  assaultNotes: "",
};

export const MAX_PALETTE_COLORS = 4;
