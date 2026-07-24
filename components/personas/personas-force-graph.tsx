"use client";

import { colorForType } from "@/components/grafo/types";
import type { PersonaGraphEdge, PersonaGraphSnapshot } from "@/lib/personas/model";
import type { PersonaRelationDraft } from "@/components/personas/persona-relations-sheet";
import { useEffect, useRef, useState } from "react";

type SimNode = {
  id: string;
  nombrePrincipal: string;
  kind: "persona" | "proyecto" | "campo";
  degree: number;
  campoSlug: string | null;
  isCenter: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed: boolean;
};

type SimEdge = PersonaGraphEdge;

export type PendingLinkPayload = PersonaRelationDraft;

type Props = {
  snapshot: PersonaGraphSnapshot;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (edge: PersonaGraphEdge | null) => void;
  onLinkRequest: (payload: PendingLinkPayload) => void;
  linkMode?: PersonaGraphSnapshot["mode"];
};

const REPULSION = 5200;
const SPRING = 0.012;
const SPRING_LENGTH = 90;
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
  return Math.min(20, 5 + Math.sqrt(n.degree) * 2.4);
}

export function PersonasForceGraph({
  snapshot,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onLinkRequest,
  linkMode = snapshot.mode,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);
  const viewRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const alphaRef = useRef(1);
  const selectedNodeRef = useRef(selectedNodeId);
  const selectedEdgeRef = useRef(selectedEdgeId);
  const hoverEdgeRef = useRef<SimEdge | null>(null);
  const linkDragRef = useRef<{
    source: SimNode;
    pointerX: number;
    pointerY: number;
    targetId: string | null;
  } | null>(null);
  const dragRef = useRef<{
    node: SimNode | null;
    panning: boolean;
    linking: boolean;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({
    node: null,
    panning: false,
    linking: false,
    lastX: 0,
    lastY: 0,
    moved: false,
  });

  const [hoverEdge, setHoverEdge] = useState<PersonaGraphEdge | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    selectedNodeRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
    selectedEdgeRef.current = selectedEdgeId;
  }, [selectedEdgeId]);

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
        nombrePrincipal: node.nombrePrincipal,
        kind: node.kind,
        degree: node.degree,
        campoSlug: node.campoSlug ?? null,
        isCenter,
        x: existing?.x ?? (isCenter ? w / 2 : w / 2 + Math.cos(angle) * radius),
        y: existing?.y ?? (isCenter ? h / 2 : h / 2 + Math.sin(angle) * radius),
        vx: 0,
        vy: 0,
        fixed: isCenter,
      };
    });
    edgesRef.current = snapshot.edges;
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
    const edgeColor = isDark ? "rgba(148,163,184,0.22)" : "rgba(100,116,139,0.28)";
    const labelColor = isDark ? "#e2e8f0" : "#1e293b";

    function tick() {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const map = new Map(nodes.map((n) => [n.id, n]));
      const alpha = alphaRef.current;

      if (alpha > 0.02 && !linkDragRef.current) {
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

      const activeEdgeId =
        hoverEdgeRef.current?.id ?? selectedEdgeRef.current ?? null;
      const linkDrag = linkDragRef.current;

      for (const edge of edgesRef.current) {
        const s = map.get(edge.source);
        const t = map.get(edge.target);
        if (!s || !t) continue;

        const isActive = edge.id === activeEdgeId;
        context.beginPath();
        context.moveTo(s.x, s.y);
        context.lineTo(t.x, t.y);
        context.lineWidth = isActive ? 2.5 : 1;
        context.strokeStyle = isActive
          ? edge.kind === "persona-proyecto"
            ? "#8b5cf6"
            : edge.kind === "persona-campo"
              ? "#f59e0b"
              : "#10b981"
          : edgeCol;
        context.stroke();

        if (isActive || scale > 1.2) {
          const mx = (s.x + t.x) / 2;
          const my = (s.y + t.y) / 2;
          const badge =
            edge.kind === "persona-proyecto" && edge.rolPrincipal
              ? edge.rolPrincipal.slice(0, 14)
              : edge.tipoRelacion.slice(0, 12);
          context.font = "9px ui-monospace, monospace";
          const tw = context.measureText(badge).width;
          context.fillStyle = isDark ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.95)";
          context.fillRect(mx - tw / 2 - 4, my - 8, tw + 8, 14);
          context.fillStyle = isActive ? "#10b981" : labelCol;
          context.fillText(badge, mx - tw / 2, my + 2);
        }
      }

      if (linkDrag) {
        const source = map.get(linkDrag.source.id) ?? linkDrag.source;
        context.beginPath();
        context.setLineDash([6, 4]);
        context.moveTo(source.x, source.y);
        context.lineTo(linkDrag.pointerX, linkDrag.pointerY);
        context.lineWidth = 2;
        context.strokeStyle = "#10b981";
        context.stroke();
        context.setLineDash([]);
      }

      const selectedNode = selectedNodeRef.current;
      const linkTargetId = linkDrag?.targetId ?? null;

      const rankedByDegree = [...nodesRef.current].sort(
        (a, b) => b.degree - a.degree || a.nombrePrincipal.localeCompare(b.nombrePrincipal),
      );
      const labelBudget = Math.max(
        12,
        Math.ceil(nodesRef.current.length * 0.28),
      );
      const priorityLabels = new Set(
        rankedByDegree.slice(0, labelBudget).map((n) => n.id),
      );

      for (const n of nodesRef.current) {
        const r = nodeRadius(n) + (n.isCenter ? 3 : 0);
        const isSel = n.id === selectedNode;
        const isLinkTarget = n.id === linkTargetId;
        context.beginPath();
        context.arc(n.x, n.y, r, 0, Math.PI * 2);
        context.fillStyle =
          n.kind === "proyecto"
            ? colorForType("proyecto")
            : n.kind === "campo"
              ? colorForType("concepto")
              : colorForType("persona");
        context.globalAlpha = isSel || isLinkTarget || n.isCenter ? 1 : 0.92;
        context.fill();
        if (isSel || isLinkTarget || n.isCenter) {
          context.lineWidth = n.isCenter ? 3.5 : 3;
          context.strokeStyle = isLinkTarget
            ? "#10b981"
            : n.isCenter
              ? "#f59e0b"
              : labelCol;
          context.stroke();
        }
        context.globalAlpha = 1;

        const showLabel =
          isSel ||
          isLinkTarget ||
          n.isCenter ||
          n.degree >= 2 ||
          priorityLabels.has(n.id) ||
          scale > 1.15;

        if (showLabel) {
          context.fillStyle = labelCol;
          const weight =
            isSel || isLinkTarget || n.isCenter || n.degree >= 4 ? 12 : 10;
          context.font = `${weight}px ui-sans-serif, system-ui`;
          const label =
            n.nombrePrincipal.length > 26
              ? `${n.nombrePrincipal.slice(0, 25)}…`
              : n.nombrePrincipal;
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

    function linkTargetAt(clientX: number, clientY: number, excludeId: string): SimNode | null {
      const { x, y } = toWorld(clientX, clientY);
      let best: SimNode | null = null;
      let bestDist = Infinity;
      for (const n of nodesRef.current) {
        if (n.id === excludeId) continue;
        if (linkMode === "exclusive" && n.kind !== "persona") continue;
        const r = nodeRadius(n) + 6;
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

    function nodeAt(
      clientX: number,
      clientY: number,
      opts?: { excludeId?: string },
    ): SimNode | null {
      const { x, y } = toWorld(clientX, clientY);
      let best: SimNode | null = null;
      let bestDist = Infinity;
      for (const n of nodesRef.current) {
        if (opts?.excludeId && n.id === opts.excludeId) continue;
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
      const startLink = Boolean(e.shiftKey && node?.kind === "persona");

      if (startLink && node) {
        const { x, y } = toWorld(e.clientX, e.clientY);
        linkDragRef.current = {
          source: node,
          pointerX: x,
          pointerY: y,
          targetId: null,
        };
        setIsLinking(true);
        dragRef.current = {
          node: null,
          panning: false,
          linking: true,
          lastX: e.clientX,
          lastY: e.clientY,
          moved: false,
        };
        canvas.style.cursor = "crosshair";
        return;
      }

      dragRef.current = {
        node,
        panning: !node,
        linking: false,
        lastX: e.clientX,
        lastY: e.clientY,
        moved: false,
      };
      if (node) node.fixed = true;
    }

    function onPointerMove(e: PointerEvent) {
      const drag = dragRef.current;
      const rect = canvas.getBoundingClientRect();

      if (drag.linking && linkDragRef.current) {
        const { x, y } = toWorld(e.clientX, e.clientY);
        const target = linkTargetAt(e.clientX, e.clientY, linkDragRef.current.source.id);
        linkDragRef.current = {
          ...linkDragRef.current,
          pointerX: x,
          pointerY: y,
          targetId: target?.id ?? null,
        };
        drag.moved = true;
        canvas.style.cursor = target ? "copy" : "crosshair";
        return;
      }

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

      if (drag.linking && linkDragRef.current) {
        const source = linkDragRef.current.source;
        const target = linkTargetAt(e.clientX, e.clientY, source.id);

        if (target) {
          onLinkRequest({
            personaId: source.id,
            personaName: source.nombrePrincipal,
            targetKind: target.kind,
            targetId: target.id,
            targetName: target.nombrePrincipal,
            campoSlug: target.campoSlug ?? undefined,
          });
        }

        linkDragRef.current = null;
        setIsLinking(false);
        canvas.style.cursor = "grab";
      } else if (drag.node) {
        drag.node.fixed = drag.node.isCenter;
        if (!drag.moved) {
          onSelectEdge(null);
          onSelectNode(drag.node.id);
        }
      } else if (drag.panning && !drag.moved) {
        const { x, y } = toWorld(e.clientX, e.clientY);
        const map = new Map(nodesRef.current.map((n) => [n.id, n]));
        const edge = edgeAt(x, y, edgesRef.current, map);
        if (edge) {
          onSelectNode(null);
          onSelectEdge(edge);
        } else {
          onSelectNode(null);
          onSelectEdge(null);
        }
      }

      dragRef.current = {
        node: null,
        panning: false,
        linking: false,
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
  }, [linkMode, onLinkRequest, onSelectEdge, onSelectNode]);

  const displayEdge = hoverEdge;
  const nodeName = (id: string) =>
    snapshot.nodes.find((n) => n.id === id)?.nombrePrincipal ?? "…";

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none select-none active:cursor-grabbing"
      />

      {isLinking && (
        <div className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-emerald-500/40 bg-background/90 px-3 py-1 font-mono text-[10px] text-emerald-600 shadow-sm backdrop-blur dark:text-emerald-300">
          Soltá sobre persona, proyecto o campo
        </div>
      )}

      {!isLinking && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-border bg-background/80 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground backdrop-blur">
          Shift + arrastrar → vincular
        </div>
      )}

      {displayEdge && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-lg border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur"
          style={{
            left: Math.min(tooltipPos.x + 12, (canvasRef.current?.clientWidth ?? 400) - 220),
            top: Math.max(tooltipPos.y - 8, 8),
          }}
        >
          <p className="font-mono text-[10px] text-emerald-500">
            {nodeName(displayEdge.source)} ↔ {nodeName(displayEdge.target)}
          </p>
          <p className="mt-1 text-xs font-medium">{displayEdge.tipoRelacion}</p>
          {displayEdge.rolPrincipal && (
            <p className="mt-0.5 text-xs text-violet-400">
              Rol: {displayEdge.rolPrincipal}
            </p>
          )}
          {displayEdge.contexto && (
            <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
              {displayEdge.contexto}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
