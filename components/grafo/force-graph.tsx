"use client";

import { useEffect, useRef } from "react";
import { colorForType, type GraphSnapshot } from "@/components/grafo/types";

type SimNode = {
  id: string;
  primaryName: string;
  type: string;
  degree: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed: boolean;
};

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

export function ForceGraph({ snapshot, selectedId, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<{ source: string; target: string }[]>([]);
  const viewRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const alphaRef = useRef(1);
  const selectedRef = useRef<string | null>(selectedId);
  const dragRef = useRef<{
    node: SimNode | null;
    panning: boolean;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({ node: null, panning: false, lastX: 0, lastY: 0, moved: false });

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  // Reconstruir simulacion cuando cambia el snapshot.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;

    const prev = new Map(nodesRef.current.map((n) => [n.id, n]));
    const count = snapshot.nodes.length;
    nodesRef.current = snapshot.nodes.map((node, i) => {
      const existing = prev.get(node.id);
      const angle = (i / Math.max(1, count)) * Math.PI * 2;
      const radius = Math.min(w, h) / 3;
      return {
        id: node.id,
        primaryName: node.primaryName,
        type: node.type,
        degree: node.degree,
        x: existing?.x ?? w / 2 + Math.cos(angle) * radius,
        y: existing?.y ?? h / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        fixed: false,
      };
    });
    edgesRef.current = snapshot.edges.map((e) => ({
      source: e.source,
      target: e.target,
    }));
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
        for (const n of nodes) {
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

      draw(ctx, map, edgeColor, labelColor, dpr);
      raf = requestAnimationFrame(tick);
    }

    function draw(
      context: CanvasRenderingContext2D,
      map: Map<string, SimNode>,
      edgeCol: string,
      labelCol: string,
      ratio: number,
    ) {
      const { scale, offsetX, offsetY } = viewRef.current;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      context.save();
      context.translate(offsetX, offsetY);
      context.scale(scale, scale);

      context.lineWidth = 1;
      context.strokeStyle = edgeCol;
      for (const edge of edgesRef.current) {
        const s = map.get(edge.source);
        const t = map.get(edge.target);
        if (!s || !t) continue;
        context.beginPath();
        context.moveTo(s.x, s.y);
        context.lineTo(t.x, t.y);
        context.stroke();
      }

      const selected = selectedRef.current;
      for (const n of nodesRef.current) {
        const r = Math.min(18, 4 + Math.sqrt(n.degree) * 2.2);
        const isSel = n.id === selected;
        context.beginPath();
        context.arc(n.x, n.y, r, 0, Math.PI * 2);
        context.fillStyle = colorForType(n.type);
        context.globalAlpha = isSel ? 1 : 0.92;
        context.fill();
        if (isSel) {
          context.lineWidth = 3;
          context.strokeStyle = labelCol;
          context.stroke();
        }
        context.globalAlpha = 1;

        if (isSel || n.degree >= 4 || scale > 1.6) {
          context.fillStyle = labelCol;
          context.font = `${isSel ? 12 : 10}px ui-sans-serif, system-ui`;
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
        const r = Math.min(18, 4 + Math.sqrt(n.degree) * 2.2) + 4;
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
      if (!drag.node && !drag.panning) return;
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
        drag.node.fixed = false;
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
    canvas.addEventListener("wheel", onWheel, { passive: false });

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [onSelect]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
    />
  );
}
