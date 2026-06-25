"use client";

import type { XBookmarkRecord } from "@/lib/ingesta/x-bookmarks/types";
import { cn } from "@/lib/utils";
import { ExternalLinkIcon, ImageIcon } from "lucide-react";

type XBookmarkTweetCardProps = {
  bookmark: XBookmarkRecord;
  className?: string;
  noir?: boolean;
};

export function XBookmarkTweetCard({
  bookmark,
  className,
  noir = false,
}: XBookmarkTweetCardProps) {
  return (
    <article
      className={cn(
        "rounded-xl border p-5",
        noir
          ? "border-white/10 bg-white/[0.03] text-white shadow-2xl shadow-black/50"
          : "border-border bg-card text-foreground",
        className,
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-semibold", noir && "text-white")}>
            {bookmark.author}
          </p>
          <p className={cn("font-mono text-[11px]", noir ? "text-white/50" : "text-muted-foreground")}>
            {bookmark.handle}
          </p>
        </div>
        {bookmark.tweetUrl && (
          <a
            href={bookmark.tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "shrink-0 rounded p-1 transition-colors",
              noir ? "text-white/40 hover:text-white" : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Abrir tuit original"
          >
            <ExternalLinkIcon className="size-3.5" />
          </a>
        )}
      </header>

      <p
        className={cn(
          "whitespace-pre-wrap text-sm leading-relaxed",
          noir ? "text-white/90" : "text-foreground",
        )}
      >
        {bookmark.text}
      </p>

      {bookmark.mediaUrls.length > 0 && (
        <div className="mt-4 space-y-2">
          <p
            className={cn(
              "flex items-center gap-1 font-mono text-[9px] uppercase tracking-wide",
              noir ? "text-white/40" : "text-muted-foreground",
            )}
          >
            <ImageIcon className="size-3" />
            Media ({bookmark.mediaUrls.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {bookmark.mediaUrls.slice(0, 4).map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "block overflow-hidden rounded-md border",
                  noir ? "border-white/10" : "border-border",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
