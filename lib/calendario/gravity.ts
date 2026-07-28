/** Escala Hermética 1–12 → densidad visual del bloque en el Tablero. */
export function hermeticDensity(weight: number | null | undefined): {
  borderWidth: string;
  inverted: boolean;
  opacity: number;
  glow: string;
  label: string;
} {
  const g = Math.min(12, Math.max(1, weight ?? 3));

  if (g >= 10) {
    return {
      borderWidth: "border-[3px]",
      inverted: true,
      opacity: 1,
      glow: "shadow-[0_0_18px_rgba(255,176,0,0.35)]",
      label: "denso",
    };
  }
  if (g >= 7) {
    return {
      borderWidth: "border-2",
      inverted: false,
      opacity: 1,
      glow: "shadow-[0_0_10px_rgba(255,176,0,0.18)]",
      label: "firme",
    };
  }
  if (g >= 4) {
    return {
      borderWidth: "border",
      inverted: false,
      opacity: 0.95,
      glow: "",
      label: "medio",
    };
  }
  return {
    borderWidth: "border",
    inverted: false,
    opacity: 0.75,
    glow: "",
    label: "leve",
  };
}

export const TABLERO_AMBER = "#FFB000";
export const CAMPAMENTO_HOUR_START = 6;
export const CAMPAMENTO_HOUR_END = 22;
