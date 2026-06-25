"use client";

import { XBookmarkTweetCard } from "@/components/ingesta/x-bookmarks/x-bookmark-tweet-card";
import { XBookmarkWeightSlider } from "@/components/ingesta/x-bookmarks/x-bookmark-weight-slider";
import type { XBookmarkRecord } from "@/lib/ingesta/x-bookmarks/types";
import { weightFromKeyboardKey } from "@/lib/ingesta/x-bookmarks/types";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
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
  const [index, setIndex] = useState(0);
  const [draftWeight, setDraftWeight] = useState(7);
  const [isExiting, setIsExiting] = useState(false);
  const pendingVotesRef = useRef<Map<string, number>>(new Map());

  const current = queue[index] ?? null;
  const remaining = queue.length - index;
  const progress = queue.length > 0 ? Math.round((index / queue.length) * 100) : 0;

  useEffect(() => {
    if (!open) return;
    setIndex(0);
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
        setIndex((currentIndex) => {
          const next = currentIndex + 1;
          if (next >= queue.length) {
            onComplete();
            onClose();
          }
          return next;
        });
        setDraftWeight(7);
      }, 80);
    },
    [onCalibrated, onComplete, onClose, queue.length],
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

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Calibración X-Bookmark en modo foco"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase">
            Noir · Vibe Calibrator
          </p>
          <p className="font-mono text-xs text-white/70">
            {remaining} restante{remaining === 1 ? "" : "s"} · {progress}%
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Salir del modo foco"
        >
          <XIcon className="size-4" />
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 sm:px-8">
        {current ? (
          <div
            className={cn(
              "flex w-full max-w-xl flex-col gap-8 transition-all duration-100",
              isExiting && "translate-x-4 opacity-0",
            )}
          >
            <XBookmarkTweetCard bookmark={current} noir />

            <XBookmarkWeightSlider
              value={draftWeight}
              onChange={setDraftWeight}
              onCommit={commitWeight}
              disabled={isExiting}
            />
          </div>
        ) : (
          <p className="font-mono text-sm text-white/60">Cola vacía</p>
        )}
      </main>
    </div>,
    document.body,
  );
}
