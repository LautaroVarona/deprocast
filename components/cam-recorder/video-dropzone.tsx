"use client";

import { useCamRecorder } from "@/components/cam-recorder/cam-recorder-context";
import { isAcceptedVideoFile } from "@/lib/cam-recorder-watcher/utils";
import { cn } from "@/lib/utils";
import { FilmIcon, UploadCloudIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

export function VideoDropzone() {
  const { phase, videoFile, loadVideo, clearVideo } = useCamRecorder();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      const video = list.find((file) => isAcceptedVideoFile(file));

      if (!video) {
        setLocalError("Solo se aceptan videos (.mp4, .m4v, .mov, .webm, .mkv).");
        return;
      }

      setLocalError(null);
      loadVideo(video);
    },
    [loadVideo],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  if (videoFile && phase !== "idle") {
    return (
      <div className="cam-recorder-noir-panel flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <FilmIcon className="size-4 shrink-0 text-emerald-400/70" />
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-white/80">
              {videoFile.name}
            </p>
            <p className="font-mono text-[10px] text-white/35">
              {(videoFile.size / (1024 * 1024)).toFixed(1)} MB · listo para
              análisis
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={clearVideo}
          className="shrink-0 rounded border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/45 transition-colors hover:border-white/20 hover:text-white/70"
        >
          Reemplazar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "cam-recorder-noir-panel group flex w-full flex-col items-center justify-center gap-3 border-dashed px-6 py-14 transition-all duration-300",
          isDragging
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]",
        )}
      >
        <UploadCloudIcon
          className={cn(
            "size-8 transition-colors",
            isDragging ? "text-emerald-400" : "text-white/25 group-hover:text-white/40",
          )}
        />
        <div className="space-y-1 text-center">
          <p className="font-mono text-xs text-white/60">
            Arrastrá una grabación de pantalla
          </p>
          <p className="font-mono text-[10px] text-white/30">
            .mp4 · .m4v · .mov · .webm · .mkv
          </p>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/x-m4v,video/quicktime,video/webm,video/x-matroska,.mp4,.m4v,.mov,.webm,.mkv"
        className="sr-only"
        onChange={(event) => {
          const files = event.target.files;
          if (files?.length) handleFiles(files);
          event.target.value = "";
        }}
      />

      {localError ? (
        <p className="font-mono text-[10px] text-rose-400/80">{localError}</p>
      ) : null}
    </div>
  );
}
