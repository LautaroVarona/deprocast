"use client";

import { useCamRecorder } from "@/components/cam-recorder/cam-recorder-context";
import { formatTimestamp } from "@/lib/cam-recorder-watcher/utils";
import { cn } from "@/lib/utils";
import {
  MaximizeIcon,
  PauseIcon,
  PlayIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export function NoirVideoPlayer() {
  const {
    videoUrl,
    onVideoTimeUpdate,
    registerSeekHandler,
    setVideoDurationSeconds,
    activeNoteId,
    notas,
  } = useCamRecorder();

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  useEffect(() => {
    registerSeekHandler(seekTo);
    return () => registerSeekHandler(null);
  }, [registerSeekHandler, seekTo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    video.load();
  }, [videoUrl]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleProgressClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const bar = progressRef.current;
      const video = videoRef.current;
      if (!bar || !video || duration <= 0) return;

      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const next = ratio * duration;
      seekTo(next);
    },
    [duration, seekTo],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === " " || event.key === "k") {
        event.preventDefault();
        togglePlay();
      }
    },
    [togglePlay],
  );

  if (!videoUrl) {
    return (
      <div className="cam-recorder-noir-panel flex aspect-video items-center justify-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Sin señal de video
        </p>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="cam-recorder-noir-panel overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="relative aspect-video bg-background">
        <video
          ref={videoRef}
          src={videoUrl}
          className="h-full w-full object-contain"
          playsInline
          onLoadedMetadata={(event) => {
            const nextDuration = event.currentTarget.duration;
            if (Number.isFinite(nextDuration) && nextDuration > 0) {
              setDuration(nextDuration);
              setVideoDurationSeconds(nextDuration);
            }
          }}
          onTimeUpdate={(event) => {
            const seconds = event.currentTarget.currentTime;
            setCurrentTime(seconds);
            onVideoTimeUpdate(seconds);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />

        {notas.length > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-12 flex h-1 px-4">
            {notas.map((note) => {
              const left = duration > 0 ? (note.timestampSeconds / duration) * 100 : 0;
              const isActive = note.id === activeNoteId;
              return (
                <span
                  key={note.id}
                  className={cn(
                    "absolute bottom-0 h-2 w-0.5 -translate-x-1/2 rounded-full transition-all",
                    isActive
                      ? "bg-primary/20 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                      : "bg-muted/40",
                  )}
                  style={{ left: `${left}%` }}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-border px-4 py-3">
        <div
          ref={progressRef}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          tabIndex={0}
          onClick={handleProgressClick}
          className="group relative h-1.5 cursor-pointer rounded-full bg-muted/40"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary/70 transition-all"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 opacity-0 shadow-[0_0_8px_rgba(52,211,153,0.6)] transition-opacity group-hover:opacity-100"
            style={{ left: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="flex size-8 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? (
              <PauseIcon className="size-3.5" />
            ) : (
              <PlayIcon className="size-3.5" />
            )}
          </button>

          <span className="font-mono text-[10px] tabular-nums text-primary/80">
            {formatTimestamp(currentTime)}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">/</span>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {formatTimestamp(duration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const video = videoRef.current;
                if (!video) return;
                const nextMuted = !isMuted;
                video.muted = nextMuted;
                setIsMuted(nextMuted);
              }}
              className="text-muted-foreground transition-colors hover:text-muted-foreground"
              aria-label={isMuted ? "Activar sonido" : "Silenciar"}
            >
              {isMuted ? (
                <VolumeXIcon className="size-3.5" />
              ) : (
                <Volume2Icon className="size-3.5" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(event) => {
                const next = Number(event.target.value);
                const video = videoRef.current;
                if (video) {
                  video.volume = next;
                  video.muted = next === 0;
                }
                setVolume(next);
                setIsMuted(next === 0);
              }}
              className="cam-recorder-volume-slider w-16"
              aria-label="Volumen"
            />

            <button
              type="button"
              onClick={() => {
                const video = videoRef.current;
                if (!video) return;
                if (document.fullscreenElement) {
                  void document.exitFullscreen();
                } else {
                  void video.requestFullscreen();
                }
              }}
              className="text-muted-foreground transition-colors hover:text-muted-foreground"
              aria-label="Pantalla completa"
            >
              <MaximizeIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
