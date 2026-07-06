import {
  DEFAULT_TRINCHERA_LOCAL,
  DEFAULT_VISUAL_PREFS,
  MAX_PALETTE_COLORS,
} from "@/lib/trinchera/visual/defaults";
import type {
  FocalShape,
  MotionMode,
  TrincheraLocalSession,
  TrincheraVisualPrefs,
} from "@/lib/trinchera/visual/types";

export const TRINCHERA_LOCAL_KEY = "deprocast:trinchera:local";

const VALID_SHAPES = new Set<FocalShape>([
  "hexagon",
  "circle",
  "triangle",
  "square",
  "diamond",
  "mandelbrot",
]);

const VALID_MOTION = new Set<MotionMode>(["fixed", "drift"]);

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeColors(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const colors = value
    .filter((c): c is string => typeof c === "string" && HEX_COLOR.test(c))
    .slice(0, MAX_PALETTE_COLORS);
  return colors.length > 0 ? colors : [...fallback];
}

function sanitizeVisual(value: unknown): TrincheraVisualPrefs {
  if (!isRecord(value)) return { ...DEFAULT_VISUAL_PREFS };

  const shape = VALID_SHAPES.has(value.shape as FocalShape)
    ? (value.shape as FocalShape)
    : DEFAULT_VISUAL_PREFS.shape;

  const motionMode = VALID_MOTION.has(value.motionMode as MotionMode)
    ? (value.motionMode as MotionMode)
    : DEFAULT_VISUAL_PREFS.motionMode;

  return {
    shape,
    motionMode,
    backgroundColors: sanitizeColors(
      value.backgroundColors,
      DEFAULT_VISUAL_PREFS.backgroundColors,
    ),
    figureColors: sanitizeColors(
      value.figureColors,
      DEFAULT_VISUAL_PREFS.figureColors,
    ),
  };
}

export function readTrincheraLocal(): TrincheraLocalSession {
  if (typeof window === "undefined") return { ...DEFAULT_TRINCHERA_LOCAL };

  try {
    const raw = window.localStorage.getItem(TRINCHERA_LOCAL_KEY);
    if (!raw) return { ...DEFAULT_TRINCHERA_LOCAL };

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...DEFAULT_TRINCHERA_LOCAL };

    return {
      visual: sanitizeVisual(parsed.visual),
      assaultNotes:
        typeof parsed.assaultNotes === "string" ? parsed.assaultNotes : "",
    };
  } catch {
    return { ...DEFAULT_TRINCHERA_LOCAL };
  }
}

export function writeTrincheraLocal(session: TrincheraLocalSession): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(TRINCHERA_LOCAL_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function buildBackgroundGradient(colors: string[]): string {
  if (colors.length === 1) return colors[0]!;
  const stops = colors
    .map((color, index) => {
      const pct = (index / (colors.length - 1)) * 100;
      return `${color} ${pct}%`;
    })
    .join(", ");
  return `linear-gradient(160deg, ${stops})`;
}

export function buildFigureGradient(colors: string[]): string {
  if (colors.length === 1) return colors[0]!;
  const stops = colors
    .map((color, index) => {
      const pct = (index / colors.length) * 100;
      return `${color} ${pct}%`;
    })
    .join(", ");
  return `linear-gradient(135deg, ${stops})`;
}
