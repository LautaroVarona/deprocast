"use client";

import type { PulseVisualState } from "@/lib/trinchera/sound-lab/types";
import { useEffect, useRef } from "react";

type MandelbrotViewProps = {
  figureColors: string[];
  pulseVisual: PulseVisualState;
  isPlaying: boolean;
  className?: string;
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(
  colors: string[],
  t: number,
): [number, number, number] {
  if (colors.length === 0) return [244, 63, 94];
  if (colors.length === 1) return hexToRgb(colors[0]!);

  const scaled = t * (colors.length - 1);
  const i = Math.floor(scaled);
  const frac = scaled - i;
  const a = hexToRgb(colors[Math.min(i, colors.length - 1)]!);
  const b = hexToRgb(colors[Math.min(i + 1, colors.length - 1)]!);

  return [
    Math.round(a[0] + (b[0] - a[0]) * frac),
    Math.round(a[1] + (b[1] - a[1]) * frac),
    Math.round(a[2] + (b[2] - a[2]) * frac),
  ];
}

export function MandelbrotView({
  figureColors,
  pulseVisual,
  isPlaying,
  className,
}: MandelbrotViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 256;
    canvas.width = size;
    canvas.height = size;

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    const zoom = isPlaying ? 0.85 + pulseVisual.intensity * 0.15 : 1;
    const centerX = -0.745;
    const centerY = 0.113;
    const scale = 3.2 / zoom;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const x0 = (px / size - 0.5) * scale + centerX;
        const y0 = (py / size - 0.5) * scale + centerY;

        let x = 0;
        let y = 0;
        let iteration = 0;
        const maxIter = 64;

        while (x * x + y * y <= 4 && iteration < maxIter) {
          const xTemp = x * x - y * y + x0;
          y = 2 * x * y + y0;
          x = xTemp;
          iteration++;
        }

        const idx = (py * size + px) * 4;
        if (iteration === maxIter) {
          data[idx] = 8;
          data[idx + 1] = 8;
          data[idx + 2] = 12;
          data[idx + 3] = 255;
        } else {
          const t =
            (iteration / maxIter) *
            (isPlaying ? 0.4 + pulseVisual.intensity * 0.6 : 0.7);
          const [r, g, b] = lerpColor(figureColors, t);
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [figureColors, isPlaying, pulseVisual.intensity, pulseVisual.phase]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: "inherit",
      }}
      aria-hidden
    />
  );
}
