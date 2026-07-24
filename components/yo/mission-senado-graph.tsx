"use client";

import type { SenadoGraphMember } from "@/lib/yo/senado-types";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";

export type DynamicGraphMember = SenadoGraphMember;

type MissionSenadoGraphProps = {
  operatorName: string;
  members: DynamicGraphMember[];
  className?: string;
};

const VIEW_W = 640;
const VIEW_H = 420;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const RADIUS = 148;

function memberPosition(index: number, total: number) {
  const count = Math.max(total, 1);
  // Empieza arriba y reparte en círculo.
  const angle = -Math.PI / 2 + (index * (Math.PI * 2)) / count;
  return {
    x: CX + Math.cos(angle) * RADIUS,
    y: CY + Math.sin(angle) * RADIUS,
  };
}

function truncateLabel(value: string, max = 18): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function MissionSenadoGraph({
  operatorName,
  members,
  className,
}: MissionSenadoGraphProps) {
  const layout = useMemo(
    () =>
      members.map((member, index) => ({
        member,
        ...memberPosition(index, members.length),
      })),
    [members],
  );

  return (
    <div
      className={
        className ??
        "relative flex h-full min-h-[16rem] w-full items-center justify-center overflow-hidden"
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,144,91,0.14),transparent_62%)]"
      />

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="relative z-10 h-full w-full max-h-[28rem]"
        role="img"
        aria-label={`Grafo del Senado: ${operatorName} y ${members.length} personas`}
      >
        <defs>
          <filter id="senado-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <AnimatePresence initial={false}>
          {layout.map(({ member, x, y }) => {
            const mx = (CX + x) / 2;
            const my = (CY + y) / 2 - 10;
            return (
              <motion.g
                key={`edge-${member.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <line
                  x1={CX}
                  y1={CY}
                  x2={x}
                  y2={y}
                  stroke="rgba(184,144,91,0.45)"
                  strokeWidth={1.4}
                />
                <rect
                  x={mx - 52}
                  y={my - 10}
                  width={104}
                  height={20}
                  rx={4}
                  fill="rgba(9,9,11,0.82)"
                  stroke="rgba(184,144,91,0.35)"
                  strokeWidth={0.8}
                />
                <text
                  x={mx}
                  y={my + 4}
                  textAnchor="middle"
                  className="fill-legion-bronze"
                  style={{ fontSize: 10, fontFamily: "ui-monospace, monospace" }}
                >
                  {truncateLabel(member.vinculo, 16)}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>

        {/* Nodo Operador (centro fijo) */}
        <g filter="url(#senado-glow)">
          <circle
            cx={CX}
            cy={CY}
            r={34}
            fill="rgba(201,166,107,0.16)"
            stroke="rgba(201,166,107,0.85)"
            strokeWidth={2}
          />
          <circle
            cx={CX}
            cy={CY}
            r={26}
            fill="rgba(24,18,12,0.92)"
            stroke="rgba(184,144,91,0.55)"
            strokeWidth={1}
          />
          <text
            x={CX}
            y={CY - 2}
            textAnchor="middle"
            className="fill-legion-gold"
            style={{
              fontSize: 11,
              fontFamily: "Georgia, 'Times New Roman', serif",
              letterSpacing: "0.08em",
            }}
          >
            {truncateLabel(operatorName || "Operador", 12)}
          </text>
          <text
            x={CX}
            y={CY + 12}
            textAnchor="middle"
            className="fill-legion-bronze/80"
            style={{ fontSize: 8, fontFamily: "ui-monospace, monospace" }}
          >
            OPERADOR
          </text>
        </g>

        <AnimatePresence initial={false}>
          {layout.map(({ member, x, y }) => (
            <motion.g
              key={member.id}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              style={{ transformOrigin: `${x}px ${y}px` }}
            >
              <circle
                cx={x}
                cy={y}
                r={24}
                fill="rgba(184,144,91,0.12)"
                stroke="rgba(184,144,91,0.75)"
                strokeWidth={1.6}
              />
              <circle
                cx={x}
                cy={y}
                r={18}
                fill="rgba(12,10,8,0.95)"
                stroke="rgba(201,166,107,0.35)"
                strokeWidth={1}
              />
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                className="fill-legion-bone"
                style={{
                  fontSize: 10,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                {truncateLabel(member.name, 10)}
              </text>
            </motion.g>
          ))}
        </AnimatePresence>
      </svg>

      {members.length === 0 ? (
        <p className="pointer-events-none absolute bottom-4 left-1/2 z-20 w-[min(90%,22rem)] -translate-x-1/2 text-center font-mono text-[10px] tracking-[0.16em] text-legion-bronze/70 uppercase">
          El grafo espera tu primera persona
        </p>
      ) : null}
    </div>
  );
}

/** Alias explícito pedido en el brief. */
export const DynamicGraph = MissionSenadoGraph;
