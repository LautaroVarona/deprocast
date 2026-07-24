"use client";

import {
  approveCandidateAction,
  mergeCandidateAction,
  rejectCandidateAction,
  searchMergeTargetsAction,
} from "@/app/triage/actions";
import { useBabel } from "@/components/babel/babel-context";
import { CandidateCard } from "@/components/triage/candidate-card";
import type {
  EntityCandidateDto,
  TriageMergeTarget,
} from "@/lib/triage/types";
import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import {
  startTransition,
  useEffect,
  useOptimistic,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type TriageStackProps = {
  initialCandidates: EntityCandidateDto[];
  onQueueEmpty?: () => void;
  className?: string;
};

type ExitDirection = "left" | "right" | "up";

type OptimisticAction =
  | { type: "remove"; id: string }
  | { type: "replace"; items: EntityCandidateDto[] };

const SWIPE_THRESHOLD = 120;

export function TriageStack({
  initialCandidates,
  onQueueEmpty,
  className,
}: TriageStackProps) {
  const { universeSlug } = useBabel();
  const [candidates, setCandidates] =
    useState<EntityCandidateDto[]>(initialCandidates);
  const [optimisticCandidates, applyOptimistic] = useOptimistic(
    candidates,
    (current, action: OptimisticAction) => {
      if (action.type === "replace") return action.items;
      return current.filter((item) => item.id !== action.id);
    },
  );

  const [mergeMode, setMergeMode] = useState(false);
  const [mergeQuery, setMergeQuery] = useState("");
  const [mergeTargets, setMergeTargets] = useState<TriageMergeTarget[]>([]);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [exitHint, setExitHint] = useState<ExitDirection | null>(null);
  const [clearFlash, setClearFlash] = useState(false);
  const busyRef = useRef(false);
  const mergeInputRef = useRef<HTMLInputElement>(null);

  const top = optimisticCandidates[0] ?? null;
  const stackPreview = optimisticCandidates.slice(1, 3);

  useEffect(() => {
    setCandidates(initialCandidates);
  }, [initialCandidates]);

  useEffect(() => {
    if (!mergeMode) return;
    mergeInputRef.current?.focus();
  }, [mergeMode]);

  useEffect(() => {
    if (!mergeMode || !top) return;
    const q = mergeQuery.trim();
    if (q.length < 1) {
      setMergeTargets([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setMergeLoading(true);
      const result = await searchMergeTargetsAction({
        type: top.type,
        q,
      });
      if (controller.signal.aborted) return;
      setMergeLoading(false);
      if (result.ok) setMergeTargets(result.data);
      else setMergeTargets([]);
    }, 160);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [mergeMode, mergeQuery, top]);

  const finishIfEmpty = (remaining: EntityCandidateDto[]) => {
    if (remaining.length === 0) {
      setClearFlash(true);
      onQueueEmpty?.();
    }
  };

  const runAction = async (
    direction: ExitDirection,
    targetNodeId?: string,
  ) => {
    if (!top || busyRef.current) return;
    if (direction === "up" && !targetNodeId) {
      setMergeMode(true);
      setExitHint("up");
      return;
    }

    busyRef.current = true;
    setMergeMode(false);
    setExitHint(direction);
    const currentId = top.id;
    const remaining = candidates.filter((item) => item.id !== currentId);

    startTransition(() => {
      applyOptimistic({ type: "remove", id: currentId });
    });
    setCandidates(remaining);
    finishIfEmpty(remaining);

    try {
      const result =
        direction === "left"
          ? await rejectCandidateAction(currentId)
          : direction === "right"
            ? await approveCandidateAction(currentId, universeSlug)
            : await mergeCandidateAction(
                currentId,
                targetNodeId ?? "",
                universeSlug,
              );

      if (!result.ok) {
        toast.error(result.error);
        setCandidates((prev) =>
          prev.some((item) => item.id === currentId)
            ? prev
            : [top, ...prev],
        );
        setClearFlash(false);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error de triage.",
      );
      setCandidates((prev) =>
        prev.some((item) => item.id === currentId) ? prev : [top, ...prev],
      );
      setClearFlash(false);
    } finally {
      busyRef.current = false;
      setExitHint(null);
      setMergeQuery("");
      setMergeTargets([]);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (
        !mergeMode &&
        (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
      ) {
        return;
      }

      if (mergeMode) {
        if (event.key === "Escape") {
          event.preventDefault();
          setMergeMode(false);
          setExitHint(null);
          setMergeQuery("");
          setMergeTargets([]);
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void runAction("left");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void runAction("right");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        void runAction("up");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hotkeys bound to top card identity
  }, [top?.id, mergeMode, candidates]);

  if (clearFlash || optimisticCandidates.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[28rem] flex-1 items-center justify-center px-4",
          className,
        )}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="max-w-xl rounded-2xl border border-[#ff6b35]/40 bg-black/80 px-6 py-8 text-center shadow-[0_0_48px_rgba(255,107,53,0.18)]"
        >
          <p className="mb-3 font-mono text-[10px] tracking-[0.28em] text-[#ff6b35] uppercase">
            mastropiero://triage
          </p>
          <p className="font-mono text-sm leading-relaxed text-[#f0e0d0]">
            Cola de entidades procesada.
            <br />
            Nodos del grafo sincronizados.
            <br />
            Carga cognitiva reducida.
          </p>
          <motion.div
            className="mx-auto mt-6 h-px w-40 bg-gradient-to-r from-transparent via-[#ff6b35] to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          />
        </motion.div>
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
      <div className="mb-4 flex w-full max-w-md items-center justify-between font-mono text-[10px] tracking-[0.18em] text-[#ff6b35]/80 uppercase">
        <span>Triage · Mastropiero</span>
        <span>{optimisticCandidates.length} pending</span>
      </div>

      <div className="relative h-[28rem] w-full max-w-md">
        {stackPreview
          .map((candidate, index) => (
            <div
              key={candidate.id}
              className="absolute inset-0"
              style={{
                transform: `translateY(${(index + 1) * 10}px) scale(${1 - (index + 1) * 0.03})`,
                zIndex: 10 - index,
                opacity: 0.55 - index * 0.15,
              }}
            >
              <CandidateCard candidate={candidate} />
            </div>
          ))
          .reverse()}

        <AnimatePresence mode="popLayout">
          {top && (
            <SwipeableTopCard
              key={top.id}
              candidate={top}
              exitHint={exitHint}
              locked={mergeMode}
              onReject={() => void runAction("left")}
              onApprove={() => void runAction("right")}
              onMerge={() => void runAction("up")}
              onSwiped={(direction) => void runAction(direction)}
            />
          )}
        </AnimatePresence>
      </div>

      {mergeMode && top && (
        <div className="absolute inset-x-0 bottom-4 z-40 mx-auto w-full max-w-md px-4">
          <div className="rounded-2xl border border-amber-400/40 bg-[#0c0c0c]/95 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] tracking-[0.16em] text-amber-300 uppercase">
                Vincular «{top.name}» → existente
              </p>
              <button
                type="button"
                onClick={() => {
                  setMergeMode(false);
                  setExitHint(null);
                  setMergeQuery("");
                  setMergeTargets([]);
                }}
                className="rounded p-1 text-[#a89888] hover:bg-white/5 hover:text-[#f5ebe0]"
                aria-label="Cerrar vínculo"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-amber-300/70" />
              <input
                ref={mergeInputRef}
                value={mergeQuery}
                onChange={(event) => setMergeQuery(event.target.value)}
                placeholder={
                  top.type === "PERSON"
                    ? "Buscar persona canónica…"
                    : "Buscar proyecto canónico…"
                }
                className="w-full rounded-lg border border-amber-400/30 bg-black py-2 pr-3 pl-9 font-mono text-sm text-[#f5ebe0] outline-none placeholder:text-[#6f6358] focus:border-amber-400/70"
              />
              {mergeLoading && (
                <Loader2Icon className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin text-amber-300/80" />
              )}
            </div>
            {mergeTargets.length > 0 && (
              <ul className="mt-2 max-h-44 overflow-auto rounded-lg border border-amber-400/20">
                {mergeTargets.map((target) => (
                  <li key={target.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-amber-400/10"
                      onClick={() => void runAction("up", target.id)}
                    >
                      <span className="text-sm text-[#f5ebe0]">
                        {target.label}
                      </span>
                      <span className="font-mono text-[10px] text-amber-300/70 uppercase">
                        {target.kind}
                        {target.sublabel ? ` · ${target.sublabel}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!mergeLoading && mergeQuery.trim() && mergeTargets.length === 0 && (
              <p className="mt-2 font-mono text-[11px] text-[#8a7a6c]">
                Sin coincidencias selladas en el grafo.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SwipeableTopCard({
  candidate,
  exitHint,
  locked,
  onReject,
  onApprove,
  onMerge,
  onSwiped,
}: {
  candidate: EntityCandidateDto;
  exitHint: ExitDirection | null;
  locked: boolean;
  onReject: () => void;
  onApprove: () => void;
  onMerge: () => void;
  onSwiped: (direction: ExitDirection) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
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
    if (info.offset.y < -SWIPE_THRESHOLD && Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
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
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x:
          exitHint === "left"
            ? -480
            : exitHint === "right"
              ? 480
              : 0,
        y: exitHint === "up" ? -420 : 0,
        opacity: 0,
        rotate:
          exitHint === "left" ? -18 : exitHint === "right" ? 18 : 0,
        transition: { duration: 0.28 },
      }}
    >
      <CandidateCard
        candidate={candidate}
        interactive
        exitHint={exitHint ?? dragHint}
        onReject={onReject}
        onApprove={onApprove}
        onMerge={onMerge}
      />
    </motion.div>
  );
}
