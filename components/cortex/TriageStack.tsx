"use client";

import {
  coagulateEntity,
  discardEntity,
  editAndCoagulateEntity,
} from "@/lib/cortex/actions";
import {
  clampHermeticGravity,
  type TriageCardDto,
  type TriageEntityType,
} from "@/lib/cortex/triage-types";
import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  GitBranchIcon,
  LayersIcon,
  ListTodoIcon,
  XIcon,
} from "lucide-react";
import {
  startTransition,
  useEffect,
  useOptimistic,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type TriageStackProps = {
  initialItems: TriageCardDto[];
  onQueueEmpty?: () => void;
  onRemainingChange?: (count: number) => void;
  className?: string;
};

type ExitDirection = "left" | "right" | "up";

type OptimisticAction =
  | { type: "remove"; id: string }
  | { type: "replace"; items: TriageCardDto[] };

const SWIPE_THRESHOLD = 110;
const ACCENT = "#FFB000";

const TYPE_LABEL: Record<TriageEntityType, string> = {
  pending_task: "PendingTask",
  quantomo: "Quantomo",
  kg_edge: "KgEdge",
};

function TypeIcon({ type }: { type: TriageEntityType }) {
  const className = "size-3.5 shrink-0";
  if (type === "pending_task") return <ListTodoIcon className={className} />;
  if (type === "quantomo") return <LayersIcon className={className} />;
  return <GitBranchIcon className={className} />;
}

export function TriageStack({
  initialItems,
  onQueueEmpty,
  onRemainingChange,
  className,
}: TriageStackProps) {
  const [items, setItems] = useState<TriageCardDto[]>(initialItems);
  const [optimisticItems, applyOptimistic] = useOptimistic(
    items,
    (current, action: OptimisticAction) => {
      if (action.type === "replace") return action.items;
      return current.filter((item) => item.id !== action.id);
    },
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editGravity, setEditGravity] = useState(6);
  const [exitHint, setExitHint] = useState<ExitDirection | null>(null);
  const [clearFlash, setClearFlash] = useState(false);
  const busyRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const top = optimisticItems[0] ?? null;
  const stackPreview = optimisticItems.slice(1, 3);

  useEffect(() => {
    setItems(initialItems);
    setClearFlash(initialItems.length === 0);
    onRemainingChange?.(initialItems.length);
  }, [initialItems, onRemainingChange]);

  useEffect(() => {
    onRemainingChange?.(optimisticItems.length);
  }, [optimisticItems.length, onRemainingChange]);

  useEffect(() => {
    if (!editOpen) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [editOpen]);

  const finishIfEmpty = (remaining: TriageCardDto[]) => {
    if (remaining.length === 0) {
      setClearFlash(true);
      onQueueEmpty?.();
    }
  };

  const openEdit = () => {
    if (!top) return;
    setEditTitle(top.title);
    setEditGravity(top.gravity);
    setEditOpen(true);
    setExitHint("up");
  };

  const closeEdit = () => {
    setEditOpen(false);
    setExitHint(null);
  };

  const runDecision = async (
    direction: ExitDirection,
    patch?: { title?: string; gravity?: number },
  ) => {
    if (!top || busyRef.current) return;
    if (direction === "up" && !patch) {
      openEdit();
      return;
    }

    busyRef.current = true;
    setEditOpen(false);
    setExitHint(direction);
    const current = top;
    const remaining = items.filter((item) => item.id !== current.id);

    startTransition(() => {
      applyOptimistic({ type: "remove", id: current.id });
    });
    setItems(remaining);
    finishIfEmpty(remaining);

    try {
      const result =
        direction === "left"
          ? await discardEntity(current.id, current.entityType)
          : direction === "right"
            ? await coagulateEntity(current.id, current.entityType)
            : await editAndCoagulateEntity({
                id: current.id,
                type: current.entityType,
                title: patch?.title,
                gravity: patch?.gravity,
              });

      if (!result.ok) {
        toast.error(result.error);
        setItems((prev) =>
          prev.some((item) => item.id === current.id)
            ? prev
            : [current, ...prev],
        );
        setClearFlash(false);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error de triage.",
      );
      setItems((prev) =>
        prev.some((item) => item.id === current.id) ? prev : [current, ...prev],
      );
      setClearFlash(false);
    } finally {
      busyRef.current = false;
      setExitHint(null);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (event.target as HTMLElement | null)?.tagName;

      if (editOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeEdit();
        } else if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          void runDecision("up", {
            title: editTitle,
            gravity: editGravity,
          });
        }
        return;
      }

      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void runDecision("left");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void runDecision("right");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        void runDecision("up");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hotkeys anclados a la carta superior
  }, [top?.id, editOpen, editTitle, editGravity, items]);

  if (clearFlash || optimisticItems.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[28rem] flex-1 items-center justify-center px-4",
          className,
        )}
      >
        <motion.pre
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="max-w-xl border border-[#FFB000]/45 bg-zinc-950 px-5 py-6 font-mono text-[12px] leading-relaxed text-[#e8e4dc]"
        >
          <span className="text-[#FFB000]">[ LOG ]</span> Cola de entropía
          procesada. Nodos sincronizados. Fricción disipada.
          <motion.span
            aria-hidden
            className="ml-1 inline-block h-3.5 w-2 translate-y-0.5 bg-[#FFB000]"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
          />
        </motion.pre>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex min-h-[32rem] flex-1 flex-col items-center justify-center px-4 py-6",
        className,
      )}
    >
      <div className="mb-4 flex w-full max-w-md items-center justify-between font-mono text-[10px] tracking-[0.2em] text-[#FFB000]/85 uppercase">
        <span>Triage · Entropía</span>
        <span>{optimisticItems.length} en cola</span>
      </div>

      <div className="relative h-[28rem] w-full max-w-md">
        {stackPreview
          .map((card, index) => (
            <div
              key={card.id}
              className="absolute inset-0"
              style={{
                transform: `translateY(${(index + 1) * 8}px) scale(${1 - (index + 1) * 0.025})`,
                zIndex: 10 - index,
                opacity: 0.5 - index * 0.12,
              }}
            >
              <TriageCardFace card={card} />
            </div>
          ))
          .reverse()}

        <AnimatePresence mode="popLayout">
          {top && (
            <SwipeableTopCard
              key={top.id}
              card={top}
              exitHint={exitHint}
              locked={editOpen}
              onReject={() => void runDecision("left")}
              onApprove={() => void runDecision("right")}
              onEdit={() => void runDecision("up")}
              onSwiped={(direction) => void runDecision(direction)}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 flex w-full max-w-md items-center justify-between gap-2 font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
        <span className="inline-flex items-center gap-1.5">
          <ArrowLeftIcon className="size-3 text-red-400" /> Reject
        </span>
        <span className="inline-flex items-center gap-1.5 text-[#FFB000]/80">
          <ArrowUpIcon className="size-3" /> Edit
        </span>
        <span className="inline-flex items-center gap-1.5">
          Coagular <ArrowRightIcon className="size-3 text-emerald-400" />
        </span>
      </div>

      {editOpen && top && (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/55 px-4 pb-8 backdrop-blur-[2px] sm:items-center sm:pb-0">
          <div className="w-full max-w-md border border-[#FFB000]/50 bg-zinc-950 p-4 shadow-[0_0_0_1px_rgba(255,176,0,0.12)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] tracking-[0.18em] text-[#FFB000] uppercase">
                Editar / Fusionar · {TYPE_LABEL[top.entityType]}
              </p>
              <button
                type="button"
                onClick={closeEdit}
                className="p-1 text-zinc-500 hover:text-zinc-200"
                aria-label="Cerrar edición"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <label className="mb-3 block space-y-1">
              <span className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                Título
              </span>
              <input
                ref={titleInputRef}
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="h-9 w-full border border-[#FFB000]/35 bg-black px-3 font-mono text-sm text-zinc-100 outline-none focus:border-[#FFB000]"
              />
            </label>

            <label className="mb-4 block space-y-1">
              <span className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                Gravedad {editGravity}/12
              </span>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={editGravity}
                onChange={(event) =>
                  setEditGravity(
                    clampHermeticGravity(Number(event.target.value)),
                  )
                }
                className="w-full accent-[#FFB000]"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="flex-1 border border-zinc-700 px-3 py-2 font-mono text-[11px] tracking-wider text-zinc-400 uppercase hover:border-zinc-500 hover:text-zinc-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() =>
                  void runDecision("up", {
                    title: editTitle,
                    gravity: editGravity,
                  })
                }
                className="flex-1 border border-[#FFB000] bg-[#FFB000]/10 px-3 py-2 font-mono text-[11px] tracking-wider text-[#FFB000] uppercase hover:bg-[#FFB000]/20"
              >
                Coagular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TriageCardFace({
  card,
  exitHint = null,
  interactive = false,
  onReject,
  onApprove,
  onEdit,
}: {
  card: TriageCardDto;
  exitHint?: ExitDirection | null;
  interactive?: boolean;
  onReject?: () => void;
  onApprove?: () => void;
  onEdit?: () => void;
}) {
  return (
    <article
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden border-2 bg-zinc-950 text-zinc-100",
        "border-[#FFB000]/70",
        exitHint === "left" &&
          "border-red-500 shadow-[0_0_28px_rgba(239,68,68,0.35)]",
        exitHint === "right" &&
          "border-emerald-400 shadow-[0_0_28px_rgba(52,211,153,0.3)]",
        exitHint === "up" &&
          "border-[#FFB000] shadow-[0_0_28px_rgba(255,176,0,0.28)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#FFB000 1px, transparent 1px), linear-gradient(90deg, #FFB000 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {exitHint && (
        <div
          className={cn(
            "pointer-events-none absolute top-4 z-10 border px-3 py-1 font-mono text-xs font-bold tracking-[0.22em] uppercase",
            exitHint === "left" &&
              "right-4 border-red-500 bg-red-950/80 text-red-300",
            exitHint === "right" &&
              "left-4 border-emerald-400 bg-emerald-950/80 text-emerald-300",
            exitHint === "up" &&
              "top-4 left-1/2 -translate-x-1/2 border-[#FFB000] bg-zinc-950/90 text-[#FFB000]",
          )}
        >
          {exitHint === "left"
            ? "REJECT"
            : exitHint === "right"
              ? "COAGULAR"
              : "EDIT"}
        </div>
      )}

      <header className="relative z-[1] flex items-center justify-between gap-2 border-b border-[#FFB000]/35 px-4 py-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-[#FFB000] uppercase">
          <TypeIcon type={card.entityType} />
          {TYPE_LABEL[card.entityType]}
        </span>
        <span
          className="font-mono text-[11px] tracking-wider tabular-nums"
          style={{ color: ACCENT }}
        >
          G{card.gravity}/12
        </span>
      </header>

      <div className="relative z-[1] flex flex-1 flex-col gap-3 px-4 py-5">
        <h2 className="text-xl leading-snug font-semibold tracking-tight text-zinc-50">
          {card.title}
        </h2>
        {card.subtitle && (
          <p className="font-mono text-[11px] tracking-wide text-zinc-500 uppercase">
            {card.subtitle}
          </p>
        )}
        {card.preview && (
          <p className="line-clamp-5 text-sm leading-relaxed text-zinc-400">
            {card.preview}
          </p>
        )}

        <div className="mt-auto border-t border-[#FFB000]/25 pt-3">
          <p className="font-mono text-[10px] tracking-[0.14em] text-[#FFB000]/70 uppercase">
            OriginAttribution
          </p>
          <p className="mt-1 font-mono text-xs text-zinc-300">
            {card.origin.label}
          </p>
          {card.origin.timestamp && (
            <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
              {new Date(card.origin.timestamp).toLocaleString("es-ES", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
      </div>

      {interactive && (
        <footer className="relative z-[1] grid grid-cols-3 border-t border-[#FFB000]/35">
          <button
            type="button"
            onClick={onReject}
            className="flex items-center justify-center gap-1.5 py-3 font-mono text-[10px] tracking-wider text-red-400 uppercase hover:bg-red-500/10"
          >
            <ArrowLeftIcon className="size-3.5" />
            Reject
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center justify-center gap-1.5 border-x border-[#FFB000]/25 py-3 font-mono text-[10px] tracking-wider text-[#FFB000] uppercase hover:bg-[#FFB000]/10"
          >
            <ArrowUpIcon className="size-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="flex items-center justify-center gap-1.5 py-3 font-mono text-[10px] tracking-wider text-emerald-400 uppercase hover:bg-emerald-500/10"
          >
            Coagular
            <ArrowRightIcon className="size-3.5" />
          </button>
        </footer>
      )}
    </article>
  );
}

function SwipeableTopCard({
  card,
  exitHint,
  locked,
  onReject,
  onApprove,
  onEdit,
  onSwiped,
}: {
  card: TriageCardDto;
  exitHint: ExitDirection | null;
  locked: boolean;
  onReject: () => void;
  onApprove: () => void;
  onEdit: () => void;
  onSwiped: (direction: ExitDirection) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const hintFromDrag = useTransform(x, (value) => {
    if (value > 56) return "right" as const;
    if (value < -56) return "left" as const;
    return null;
  });
  const [dragHint, setDragHint] = useState<ExitDirection | null>(null);

  useEffect(() => {
    return hintFromDrag.on("change", (value) => {
      setDragHint(value);
    });
  }, [hintFromDrag]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (locked) return;
    if (
      info.offset.y < -SWIPE_THRESHOLD &&
      Math.abs(info.offset.y) > Math.abs(info.offset.x)
    ) {
      onSwiped("up");
      return;
    }
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwiped("right");
      return;
    }
    if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwiped("left");
    }
  };

  return (
    <motion.div
      className="absolute inset-0 z-20"
      style={{ x, y, rotate }}
      drag={locked ? false : true}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.88}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.97, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x:
          exitHint === "left" ? -480 : exitHint === "right" ? 480 : 0,
        y: exitHint === "up" ? -420 : 0,
        opacity: 0,
        rotate: exitHint === "left" ? -16 : exitHint === "right" ? 16 : 0,
        transition: { duration: 0.26 },
      }}
    >
      <TriageCardFace
        card={card}
        interactive
        exitHint={exitHint ?? dragHint}
        onReject={onReject}
        onApprove={onApprove}
        onEdit={onEdit}
      />
    </motion.div>
  );
}
