"use client";

import { useEffect, useRef, useState } from "react";
import {
  colorForType,
  type GraphSnapshot,
  type SnapshotEdge,
} from "@/components/grafo/types";

type SimNode = {
  id: string;
  primaryName: string;
  type: string;
  degree: number;
  isCenter: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed: boolean;
};

type SimEdge = SnapshotEdge;

type Props = {
  snapshot: GraphSnapshot;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

const REPULSION = 5200;
const SPRING = 0.012;
const SPRING_LENGTH = 70;
const DAMPING = 0.86;
const CENTER_PULL = 0.0016;

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function edgeAt(
  x: number,
  y: number,
  edges: SimEdge[],
  map: Map<string, SimNode>,
  threshold = 8,
): SimEdge | null {
  let best: SimEdge | null = null;
  let bestDist = threshold;
  for (const edge of edges) {
    const s = map.get(edge.source);
    const t = map.get(edge.target);
    if (!s || !t) continue;
    const d = distToSegment(x, y, s.x, s.y, t.x, t.y);
    if (d < bestDist) {
      best = edge;
      bestDist = d;
    }
  }
  return best;
}

function nodeRadius(n: SimNode): number {
  return Math.min(18, 4 + Math.sqrt(n.degree) * 2.2);
}

export function ForceGraph({ snapshot, selectedId, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);
  const nodeNamesRef = useRef<Map<string, string>>(new Map());
  const viewRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const alphaRef = useRef(1);
  const selectedRef = useRef<string | null>(selectedId);
  const hoverEdgeRef = useRef<SimEdge | null>(null);
  const dragRef = useRef<{
    node: SimNode | null;
    panning: boolean;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({ node: null, panning: false, lastX: 0, lastY: 0, moved: false });

  const [hoverEdge, setHoverEdge] = useState<SnapshotEdge | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;

    const prev = new Map(nodesRef.current.map((n) => [n.id, n]));
    const count = snapshot.nodes.length;
    const centerId =
      snapshot.centerNodeId ??
      snapshot.nodes.find((node) => node.isCenter)?.id ??
      null;
    nodesRef.current = snapshot.nodes.map((node, i) => {
      const existing = prev.get(node.id);
      const isCenter = Boolean(centerId && node.id === centerId);
      const angle = (i / Math.max(1, count)) * Math.PI * 2;
      const radius = Math.min(w, h) / 3;
      return {
        id: node.id,
        primaryName: node.primaryName,
        type: node.type,
        degree: node.degree,
        isCenter,
        x: existing?.x ?? (isCenter ? w / 2 : w / 2 + Math.cos(angle) * radius),
        y: existing?.y ?? (isCenter ? h / 2 : h / 2 + Math.sin(angle) * radius),
        vx: 0,
        vy: 0,
        fixed: isCenter,
      };
    });
    edgesRef.current = snapshot.edges;
    nodeNamesRef.current = new Map(
      snapshot.nodes.map((node) => [node.id, node.primaryName]),
    );
    alphaRef.current = 1;
  }, [snapshot]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    let raf = 0;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const isDark = document.documentElement.classList.contains("dark");
    const edgeColor = isDark ? "rgba(148,163,184,0.18)" : "rgba(100,116,139,0.22)";
    const labelColor = isDark ? "#e2e8f0" : "#1e293b";

    function tick() {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const map = new Map(nodes.map((n) => [n.id, n]));
      const alpha = alphaRef.current;

      if (alpha > 0.02) {
        for (let i = 0; i < nodes.length; i += 1) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j += 1) {
            const b = nodes[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let distSq = dx * dx + dy * dy;
            if (distSq < 0.01) {
              dx = Math.random() - 0.5;
              dy = Math.random() - 0.5;
              distSq = 1;
            }
            const dist = Math.sqrt(distSq);
            const force = (REPULSION / distSq) * alpha;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx += fx;
            a.vy += fy;
            b.vx -= fx;
            b.vy -= fy;
          }
        }

        for (const edge of edges) {
          const s = map.get(edge.source);
          const t = map.get(edge.target);
          if (!s || !t) continue;
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = SPRING * (dist - SPRING_LENGTH) * alpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          s.vx += fx;
          s.vy += fy;
          t.vx -= fx;
          t.vy -= fy;
        }

        const cx = canvas.clientWidth / 2;
        const cy = canvas.clientHeight / 2;
        const draggingId = dragRef.current.node?.id ?? null;
        for (const n of nodes) {
          if (n.isCenter && n.id !== draggingId) {
            n.x = cx;
            n.y = cy;
            n.vx = 0;
            n.vy = 0;
            n.fixed = true;
            continue;
          }
          if (n.fixed) continue;
          n.vx += (cx - n.x) * CENTER_PULL * alpha;
          n.vy += (cy - n.y) * CENTER_PULL * alpha;
          n.vx *= DAMPING;
          n.vy *= DAMPING;
          n.x += n.vx;
          n.y += n.vy;
        }

        alphaRef.current = alpha * 0.992;
      }

      draw(ctx, map, edgeColor, labelColor, dpr, isDark);
      raf = requestAnimationFrame(tick);
    }

    function draw(
      context: CanvasRenderingContext2D,
      map: Map<string, SimNode>,
      edgeCol: string,
      labelCol: string,
      ratio: number,
      dark: boolean,
    ) {
      const { scale, offsetX, offsetY } = viewRef.current;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      context.save();
      context.translate(offsetX, offsetY);
      context.scale(scale, scale);

      const activeEdgeId = hoverEdgeRef.current?.id ?? null;

      for (const edge of edgesRef.current) {
        const s = map.get(edge.source);
        const t = map.get(edge.target);
        if (!s || !t) continue;

        const isActive = edge.id === activeEdgeId;
        context.beginPath();
        context.moveTo(s.x, s.y);
        context.lineTo(t.x, t.y);
        context.lineWidth = isActive ? 2.5 : 1;
        context.strokeStyle = isActive ? "#10b981" : edgeCol;
        context.stroke();

        if (isActive || scale > 1.2) {
          const mx = (s.x + t.x) / 2;
          const my = (s.y + t.y) / 2;
          const badge = edge.relationType.slice(0, 14);
          context.font = "9px ui-monospace, monospace";
          const tw = context.measureText(badge).width;
          context.fillStyle = dark
            ? "rgba(15,23,42,0.92)"
            : "rgba(255,255,255,0.95)";
          context.fillRect(mx - tw / 2 - 4, my - 8, tw + 8, 14);
          context.fillStyle = isActive ? "#10b981" : labelCol;
          context.fillText(badge, mx - tw / 2, my + 2);
        }
      }

      const selected = selectedRef.current;
      for (const n of nodesRef.current) {
        const r = nodeRadius(n) + (n.isCenter ? 3 : 0);
        const isSel = n.id === selected;
        context.beginPath();
        context.arc(n.x, n.y, r, 0, Math.PI * 2);
        context.fillStyle = colorForType(n.type);
        context.globalAlpha = isSel || n.isCenter ? 1 : 0.92;
        context.fill();
        if (isSel || n.isCenter) {
          context.lineWidth = n.isCenter ? 3.5 : 3;
          context.strokeStyle = n.isCenter ? "#f59e0b" : labelCol;
          context.stroke();
        }
        context.globalAlpha = 1;

        if (isSel || n.isCenter || n.degree >= 4 || scale > 1.6) {
          context.fillStyle = labelCol;
          context.font = `${isSel || n.isCenter ? 12 : 10}px ui-sans-serif, system-ui`;
          const label =
            n.primaryName.length > 28
              ? `${n.primaryName.slice(0, 27)}…`
              : n.primaryName;
          context.fillText(label, n.x + r + 2, n.y + 3);
        }
      }

      context.restore();
    }

    function toWorld(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect();
      const { scale, offsetX, offsetY } = viewRef.current;
      return {
        x: (clientX - rect.left - offsetX) / scale,
        y: (clientY - rect.top - offsetY) / scale,
      };
    }

    function nodeAt(clientX: number, clientY: number): SimNode | null {
      const { x, y } = toWorld(clientX, clientY);
      let best: SimNode | null = null;
      let bestDist = Infinity;
      for (const n of nodesRef.current) {
        const r = nodeRadius(n) + 4;
        const dx = n.x - x;
        const dy = n.y - y;
        const d = dx * dx + dy * dy;
        if (d <= r * r && d < bestDist) {
          best = n;
          bestDist = d;
        }
      }
      return best;
    }

    function onPointerDown(e: PointerEvent) {
      canvas.setPointerCapture(e.pointerId);
      const node = nodeAt(e.clientX, e.clientY);
      dragRef.current = {
        node,
        panning: !node,
        lastX: e.clientX,
        lastY: e.clientY,
        moved: false,
      };
      if (node) node.fixed = true;
    }

    function onPointerMove(e: PointerEvent) {
      const drag = dragRef.current;
      const rect = canvas.getBoundingClientRect();

      if (!drag.node && !drag.panning) {
        const { x, y } = toWorld(e.clientX, e.clientY);
        const map = new Map(nodesRef.current.map((n) => [n.id, n]));
        const hovered = edgeAt(x, y, edgesRef.current, map);
        hoverEdgeRef.current = hovered;
        setHoverEdge(hovered);
        if (hovered) {
          setTooltipPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
        canvas.style.cursor = hovered ? "pointer" : "grab";
        return;
      }

      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;

      if (drag.node) {
        const { scale } = viewRef.current;
        drag.node.x += dx / scale;
        drag.node.y += dy / scale;
        drag.node.vx = 0;
        drag.node.vy = 0;
        alphaRef.current = Math.max(alphaRef.current, 0.3);
      } else if (drag.panning) {
        viewRef.current.offsetX += dx;
        viewRef.current.offsetY += dy;
      }
    }

    function onPointerUp(e: PointerEvent) {
      const drag = dragRef.current;
      if (drag.node) {
        // El hub del Operador vuelve a anclarse al centro.
        drag.node.fixed = drag.node.isCenter;
        if (!drag.moved) onSelect(drag.node.id);
      } else if (drag.panning && !drag.moved) {
        onSelect(null);
      }
      dragRef.current = {
        node: null,
        panning: false,
        lastX: 0,
        lastY: 0,
        moved: false,
      };
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    function onPointerLeave() {
      hoverEdgeRef.current = null;
      setHoverEdge(null);
      canvas.style.cursor = "grab";
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const view = viewRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const newScale = Math.min(4, Math.max(0.2, view.scale * factor));
      view.offsetX = mx - ((mx - view.offsetX) * newScale) / view.scale;
      view.offsetY = my - ((my - view.offsetY) * newScale) / view.scale;
      view.scale = newScale;
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [onSelect]);

  const sourceName = hoverEdge
    ? (nodeNamesRef.current.get(hoverEdge.source) ?? hoverEdge.source)
    : "";
  const targetName = hoverEdge
    ? (nodeNamesRef.current.get(hoverEdge.target) ?? hoverEdge.target)
    : "";

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
      />

      {hoverEdge && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-lg border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur"
          style={{
            left: Math.min(
              tooltipPos.x + 12,
              (canvasRef.current?.clientWidth ?? 400) - 240,
            ),
            top: Math.max(tooltipPos.y - 8, 8),
          }}
        >
          <p className="font-mono text-[10px] text-emerald-500 uppercase">
            Relación
          </p>
          <p className="mt-1 text-xs font-medium">{hoverEdge.relationType}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {sourceName} → {targetName}
          </p>
          {hoverEdge.context && (
            <p className="mt-1 line-clamp-4 text-xs text-muted-foreground">
              {hoverEdge.context}
            </p>
          )}
          <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">
            Confianza {(hoverEdge.confidence * 100).toFixed(0)}%
            {hoverEdge.weight !== null ? ` · peso ${hoverEdge.weight}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
