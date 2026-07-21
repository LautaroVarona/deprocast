"use client";

import { XBookmarkMediaGrid } from "@/components/ingesta/x-bookmarks/x-bookmark-media";
import type { XBookmarkRecord } from "@/lib/ingesta/x-bookmarks/types";
import { bookmarkDateLabel } from "@/lib/ingesta/x-bookmarks/utils";
import { cn } from "@/lib/utils";
import { ExternalLinkIcon } from "lucide-react";

type XBookmarkTweetCardProps = {
  bookmark: XBookmarkRecord;
  className?: string;
  noir?: boolean;
  /** Modo calibrador: ocupa el viewport sin scroll. */
  fitViewport?: boolean;
};

export function XBookmarkTweetCard({
  bookmark,
  className,
  noir = false,
  fitViewport = false,
}: XBookmarkTweetCardProps) {
  const dateLabel = bookmarkDateLabel(bookmark);
  const hasMedia = bookmark.mediaUrls.length > 0;
  const authorInitial = bookmark.author.trim().charAt(0).toUpperCase() || "?";

  const header = (
    <header className="flex shrink-0 items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-semibold",
            noir
              ? "border-border bg-foreground/[0.06] text-muted-foreground"
              : "border-border bg-muted text-foreground",
          )}
          aria-hidden
        >
          {authorInitial}
        </div>
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-semibold", noir && "text-foreground")}>
            {bookmark.author}
          </p>
          <div
            className={cn(
              "mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px]",
              noir ? "text-muted-foreground" : "text-muted-foreground",
            )}
          >
            <span>{bookmark.handle}</span>
            {dateLabel ? (
              <time
                dateTime={bookmark.bookmarkedAt}
                className={cn(
                  "rounded-full px-2 py-0.5",
                  noir ? "bg-foreground/[0.06] text-muted-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {dateLabel}
              </time>
            ) : null}
          </div>
        </div>
      </div>
      {bookmark.tweetUrl ? (
        <a
          href={bookmark.tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] transition-colors",
            noir
              ? "border-border text-muted-foreground hover:border-border hover:bg-foreground/[0.04] hover:text-foreground"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          Ver en X
          <ExternalLinkIcon className="size-3" />
        </a>
      ) : null}
    </header>
  );

  const text = (
    <p
      className={cn(
        "whitespace-pre-wrap leading-relaxed",
        noir ? "text-foreground/88" : "text-foreground",
        fitViewport
          ? cn(
              "text-[15px]",
              hasMedia ? "line-clamp-[8] md:line-clamp-[12]" : "line-clamp-[14] md:line-clamp-[18]",
            )
          : "text-sm",
      )}
    >
      {bookmark.text}
    </p>
  );

  const media = (
    <XBookmarkMediaGrid
      urls={bookmark.mediaUrls}
      tweetUrl={bookmark.tweetUrl}
      noir={noir}
      fitViewport={fitViewport}
    />
  );

  if (fitViewport) {
    return (
      <article
        className={cn(
          "x-bookmark-noir-panel flex h-full min-h-0 overflow-hidden p-4 sm:p-5",
          hasMedia ? "grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" : "flex flex-col",
          className,
        )}
      >
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          {header}
          <div className="min-h-0 overflow-hidden">{text}</div>
        </div>
        {hasMedia ? <div className="min-h-0 overflow-hidden">{media}</div> : null}
      </article>
    );
  }

  return (
    <article
      className={cn(
        "rounded-xl border p-5",
        noir
          ? "border-border bg-foreground/[0.03] text-foreground shadow-2xl shadow-foreground/20"
          : "border-border bg-card text-foreground",
        className,
      )}
    >
      {header}
      <div className="mt-3">{text}</div>
      {media}
    </article>
  );
}
