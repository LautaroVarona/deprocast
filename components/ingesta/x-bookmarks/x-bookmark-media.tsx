"use client";

import { cn } from "@/lib/utils";
import { ImageOffIcon, PlayIcon } from "lucide-react";
import { useState } from "react";

export type BookmarkMediaKind = "image" | "video" | "video-poster";

export function classifyBookmarkMediaUrl(url: string): BookmarkMediaKind {
  if (/video\.twimg\.com/i.test(url) || /\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return "video";
  }
  if (/amplify_video_thumb/i.test(url)) {
    return "video-poster";
  }
  return "image";
}

type XBookmarkMediaGridProps = {
  urls: string[];
  tweetUrl?: string;
  noir?: boolean;
  expanded?: boolean;
  /** Ocupa el espacio libre del viewport sin provocar scroll. */
  fitViewport?: boolean;
};

export function XBookmarkMediaGrid({
  urls,
  tweetUrl,
  noir = false,
  expanded = false,
  fitViewport = false,
}: XBookmarkMediaGridProps) {
  if (urls.length === 0) return null;

  const fit = fitViewport || expanded;

  return (
    <div
      className={cn(
        fitViewport ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "mt-4 space-y-2",
      )}
    >
      {!fitViewport && (
        <p
          className={cn(
            "font-mono text-[10px] uppercase tracking-wide",
            noir ? "text-muted-foreground" : "text-muted-foreground",
          )}
        >
          Media · {urls.length}
        </p>
      )}
      <div
        className={cn(
          "gap-1.5",
          fitViewport
            ? cn(
                "grid min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted/40 p-1.5",
                urls.length === 1 ? "grid-cols-1 grid-rows-1" : "grid-cols-2 grid-rows-2",
              )
            : cn("grid", urls.length === 1 ? "grid-cols-1" : "grid-cols-2"),
        )}
      >
        {urls.slice(0, 4).map((url) => (
          <MediaTile
            key={url}
            url={url}
            tweetUrl={tweetUrl}
            noir={noir}
            fit={fit}
          />
        ))}
      </div>
    </div>
  );
}

type MediaTileProps = {
  url: string;
  tweetUrl?: string;
  noir?: boolean;
  fit?: boolean;
};

function MediaTile({ url, tweetUrl, noir, fit = false }: MediaTileProps) {
  const [failed, setFailed] = useState(false);
  const kind = classifyBookmarkMediaUrl(url);
  const frameClass = cn(
    "overflow-hidden rounded-md border",
    noir ? "border-border bg-muted/40" : "border-border bg-muted/30",
    fit && "flex h-full min-h-0 items-center justify-center",
  );
  const mediaClass = fit
    ? "max-h-full max-w-full object-contain"
    : "aspect-video w-full object-cover";

  if (failed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          frameClass,
          !fit && "aspect-video",
          "flex flex-col items-center justify-center gap-1 p-3 text-center",
        )}
      >
        <ImageOffIcon className={cn("size-5", noir ? "text-muted-foreground" : "text-muted-foreground")} />
        <span className={cn("font-mono text-[10px]", noir ? "text-muted-foreground" : "text-muted-foreground")}>
          Abrir media
        </span>
      </a>
    );
  }

  if (kind === "video") {
    return (
      <div className={frameClass}>
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className={cn(mediaClass, fit && "h-full w-full")}
          onError={() => setFailed(true)}
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      className={mediaClass}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );

  if (kind === "video-poster") {
    const wrapper = tweetUrl ?? url;
    return (
      <a
        href={wrapper}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(frameClass, "relative block")}
        title="Ver video en X"
      >
        {image}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/35">
          <span className="flex size-10 items-center justify-center rounded-full bg-foreground/40 text-foreground">
            <PlayIcon className="size-5 fill-white" />
          </span>
        </span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(frameClass, "block")}
    >
      {image}
    </a>
  );
}
