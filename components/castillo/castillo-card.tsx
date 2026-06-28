"use client";

import { useCastillo } from "@/components/castillo/castillo-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { ACCENT_CLASSES, SOURCE_TYPE_LABELS } from "@/lib/castillo/constants";
import type { CastleCardDto } from "@/lib/castillo/types";
import { cn } from "@/lib/utils";
import { ExternalLinkIcon, Trash2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type CastilloCardProps = {
  card: CastleCardDto;
};

export function CastilloCardSurface({ card }: CastilloCardProps) {
  const { updateCard, removeCard, isBusy } = useCastillo();
  const [tagInput, setTagInput] = useState("");
  const accentClass =
    ACCENT_CLASSES[card.accent ?? "zinc"] ?? ACCENT_CLASSES.zinc;

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || card.tags.includes(trimmed)) return;
    const tags = [...card.tags, trimmed];
    void updateCard(card.id, { tags, emitClassificationEvent: true });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    const tags = card.tags.filter((item) => item !== tag);
    void updateCard(card.id, { tags, emitClassificationEvent: true });
  };

  return (
    <div
      className={cn(
        "castillo-card flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#141418]/90",
        accentClass,
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/8 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-semibold text-white">
            {card.title}
          </p>
          <p className="font-mono text-[9px] text-white/35">
            {SOURCE_TYPE_LABELS[card.sourceType]}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {card.deepLink ? (
            <Link
              href={card.deepLink}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "size-6 text-white/40 hover:bg-white/10 hover:text-white",
              )}
            >
              <ExternalLinkIcon className="size-3" />
            </Link>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 text-white/40 hover:bg-rose-500/20 hover:text-rose-300"
            disabled={isBusy}
            onClick={() => void removeCard(card.id)}
            aria-label="Quitar del canvas"
          >
            <Trash2Icon className="size-3" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {card.subtitle ? (
          <p className="line-clamp-3 text-[11px] leading-relaxed text-white/50">
            {card.subtitle}
          </p>
        ) : (
          <p className="text-[11px] text-white/30 italic">
            Sin preview — clasificá libremente.
          </p>
        )}

        <div className="mt-auto space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-white/70"
              >
                {tag}
                <button
                  type="button"
                  className="text-white/40 hover:text-white"
                  onClick={() => removeTag(tag)}
                  aria-label={`Quitar tag ${tag}`}
                >
                  <XIcon className="size-2.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              placeholder="Tag…"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white placeholder:text-white/25"
              onKeyDown={(event) => {
                if (event.key === "Enter") addTag();
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 border-white/10 px-2 text-[10px] text-white/70"
              onClick={addTag}
            >
              +
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
