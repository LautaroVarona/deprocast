"use client";

import { AREA_THEMES } from "@/lib/meta-meteador/area-theme";
import type { SemanticBiasEntry } from "@/lib/cortex/types";
import { META_AREAS } from "@/lib/meta-meteador/types";
import { cn } from "@/lib/utils";

type SemanticBiasChartProps = {
  data: SemanticBiasEntry[];
  className?: string;
};

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function buildRadarPolygon(
  cx: number,
  cy: number,
  maxRadius: number,
  values: number[],
): string {
  const step = 360 / values.length;
  return values
    .map((value, index) => {
      const radius = (Math.min(value, 12) / 12) * maxRadius;
      const point = polarToCartesian(cx, cy, radius, index * step);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

export function SemanticBiasChart({ data, className }: SemanticBiasChartProps) {
  const cx = 80;
  const cy = 80;
  const maxRadius = 58;
  const values = META_AREAS.map(
    (area) => data.find((entry) => entry.area === area)?.score ?? 0,
  );
  const polygon = buildRadarPolygon(cx, cy, maxRadius, values);

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <svg
        viewBox="0 0 160 160"
        className="size-36 shrink-0"
        aria-label="Sesgo semántico últimos 7 días"
        role="img"
      >
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={buildRadarPolygon(cx, cy, maxRadius * scale, [12, 12, 12, 12, 12, 12])}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}
        {META_AREAS.map((area, index) => {
          const step = 360 / META_AREAS.length;
          const outer = polarToCartesian(cx, cy, maxRadius, index * step);
          return (
            <line
              key={area}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={polygon}
          fill="url(#cortexBiasGradient)"
          fillOpacity={0.35}
          stroke="oklch(0.65 0.15 265)"
          strokeWidth={1.5}
          strokeOpacity={0.8}
        />
        <defs>
          <linearGradient id="cortexBiasGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.55 0.18 265)" />
            <stop offset="100%" stopColor="oklch(0.6 0.14 200)" />
          </linearGradient>
        </defs>
      </svg>

      <ul className="grid flex-1 gap-1.5 text-xs">
        {META_AREAS.map((area) => {
          const entry = data.find((item) => item.area === area);
          const theme = AREA_THEMES[area];
          const score = entry?.score ?? 0;
          const width = Math.round((score / 12) * 100);

          return (
            <li key={area} className="flex items-center gap-2">
              <span
                className={cn(
                  "w-14 shrink-0 font-medium",
                  theme.textClass,
                )}
              >
                {theme.shortLabel}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${width}%`,
                    backgroundColor: theme.color,
                  }}
                />
              </div>
              <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
                {score > 0 ? score.toFixed(1) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
