export type FocalShape =
  | "hexagon"
  | "circle"
  | "triangle"
  | "square"
  | "diamond"
  | "mandelbrot";

export type MotionMode = "fixed" | "drift";

export type TrincheraVisualPrefs = {
  shape: FocalShape;
  motionMode: MotionMode;
  backgroundColors: string[];
  figureColors: string[];
};

export type TrincheraLocalSession = {
  visual: TrincheraVisualPrefs;
  assaultNotes: string;
};

export const FOCAL_SHAPE_LABELS: Record<FocalShape, string> = {
  hexagon: "Hexágono",
  circle: "Círculo",
  triangle: "Triángulo",
  square: "Cuadrado",
  diamond: "Diamante",
  mandelbrot: "Mandelbrot",
};
