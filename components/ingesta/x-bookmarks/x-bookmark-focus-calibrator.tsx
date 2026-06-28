"use client";

import { XBookmarkTweetCard } from "@/components/ingesta/x-bookmarks/x-bookmark-tweet-card";
import { XBookmarkWeightSlider } from "@/components/ingesta/x-bookmarks/x-bookmark-weight-slider";
import type { XBookmarkRecord } from "@/lib/ingesta/x-bookmarks/types";
import { weightFromKeyboardKey } from "@/lib/ingesta/x-bookmarks/types";
import { shuffleBookmarks } from "@/lib/ingesta/x-bookmarks/utils";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "deprocast:x-bookmark-calibrator";

type XBookmarkFocusCalibratorProps = {
  queue: XBookmarkRecord[];
  open: boolean;
  onClose: () => void;
  onCalibrated: (bookmark: XBookmarkRecord, weight: number) => void;
  onComplete: () => void;
};

export function XBookmarkFocusCalibrator({
  queue,
  open,
  onClose,
  onCalibrated,
  onComplete,
}: XBookmarkFocusCalibratorProps) {
  const [sessionQueue, setSessionQueue] = useState<XBookmarkRecord[]>([]);
  const [draftWeight, setDraftWeight] = useState(7);
  const [isExiting, setIsExiting] = useState(false);
  const pendingVotesRef = useRef<Map<string, number>>(new Map());
  const sessionTotalRef = useRef(0);
  const sessionInitializedRef = useRef(false);

  const current = sessionQueue[0] ?? null;
  const remaining = sessionQueue.length;
  const completed = sessionTotalRef.current - remaining;
  const progress =
    sessionTotalRef.current > 0
      ? Math.round((completed / sessionTotalRef.current) * 100)
      : 0;

  useEffect(() => {
    if (!open) {
      sessionInitializedRef.current = false;
      setSessionQueue([]);
      return;
    }

    if (sessionInitializedRef.current) return;

    const shuffled = shuffleBookmarks(queue);
    sessionTotalRef.current = shuffled.length;
    sessionInitializedRef.current = true;
    setSessionQueue(shuffled);
    setDraftWeight(7);
    setIsExiting(false);
    pendingVotesRef.current = new Map();
  }, [open, queue]);

  const persistVote = useCallback(
    async (bookmarkId: string, weight: number) => {
      pendingVotesRef.current.set(bookmarkId, weight);
      void fetch(`/api/ingesta/x-bookmarks/${bookmarkId}/calibrate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight }),
      }).catch(() => {
        // Voto ya en memoria local; reintento silencioso en background
      });

      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as {
          votes?: Record<string, number>;
        };
        const votes = stored.votes ?? {};
        votes[bookmarkId] = weight;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ votes }));
      } catch {
        // ignore
      }
    },
    [],
  );

  const advance = useCallback(
    (bookmark: XBookmarkRecord, weight: number) => {
      onCalibrated(bookmark, weight);
      setIsExiting(true);

      window.setTimeout(() => {
        setIsExiting(false);
        setSessionQueue((currentQueue) => {
          const next = currentQueue.slice(1);
          if (next.length === 0) {
            onComplete();
            onClose();
          }
          return next;
        });
        setDraftWeight(7);
      }, 80);
    },
    [onCalibrated, onComplete, onClose],
  );

  const commitWeight = useCallback(
    (weight: number) => {
      if (!current || isExiting) return;
      void persistVote(current.id, weight);
      advance(current, weight);
    },
    [advance, current, isExiting, persistVote],
  );

  useEffect(() => {
    if (!open || !current) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      const weight = weightFromKeyboardKey(event.key);
      if (weight !== null) {
        event.preventDefault();
        setDraftWeight(weight);
        commitWeight(weight);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, current, commitWeight, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="x-bookmark-noir-root fixed inset-0 z-[60] flex h-dvh max-h-dvh flex-col overflow-hidden text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Calibración X-Bookmark en modo foco"
    >
      <header className="shrink-0 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.28em] text-white/40 uppercase">
              Noir · Vibe Calibrator
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-mono text-sm text-white/80">
                <span className="font-semibold text-white">{remaining}</span> restante
                {remaining === 1 ? "" : "s"}
              </p>
              <p className="font-mono text-xs text-white/40">
                {completed} de {sessionTotalRef.current} · {progress}%
              </p>
            </div>
            <div
              className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-white/35 to-white/85 transition-[width] duration-300"
                style={{ width: `${Math.max(progress, remaining > 0 ? 2 : 0)}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 px-2.5 py-1.5 font-mono text-[10px] text-white/55 transition-colors hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
          >
            Salir · Esc
          </button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-3 overflow-hidden px-3 py-3 sm:px-5">
        {current ? (
          <>
            <div
              className={cn(
                "min-h-0 overflow-hidden transition-all duration-100",
                isExiting && "translate-x-4 opacity-0",
              )}
            >
              <XBookmarkTweetCard bookmark={current} noir fitViewport />
            </div>

            <XBookmarkWeightSlider
              value={draftWeight}
              onChange={setDraftWeight}
              onCommit={commitWeight}
              disabled={isExiting}
              compact
            />
          </>
        ) : (
          <p className="font-mono text-sm text-white/60">Cola vacía</p>
        )}
      </main>
    </div>,
    document.body,
  );
}
