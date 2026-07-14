"use client";

import type { InputModality } from "@/components/salud/types";
import { cn } from "@/lib/utils";
import { ImageIcon, Loader2Icon, MicIcon, SquareIcon } from "lucide-react";
import { useEffect, useRef } from "react";

type UnifiedMealInputProps = {
  value: string;
  onChange: (value: string) => void;
  modality: InputModality;
  imagePreviewUrl?: string | null;
  audioReady?: boolean;
  audioDurationSec?: number;
  isRecording?: boolean;
  isProcessing?: boolean;
  processingLabel?: string;
  onImagePick: (file: File) => void;
  onToggleRecord: () => void;
  disabled?: boolean;
};

export function UnifiedMealInput({
  value,
  onChange,
  modality,
  imagePreviewUrl,
  audioReady,
  audioDurationSec,
  isRecording,
  isProcessing,
  processingLabel,
  onImagePick,
  onToggleRecord,
  disabled,
}: UnifiedMealInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 focus-within:border-zinc-700/80">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/heic"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImagePick(file);
          event.target.value = "";
        }}
      />

      {imagePreviewUrl ? (
        <div className="relative h-16 shrink-0 overflow-hidden border-b border-zinc-800/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreviewUrl}
            alt="Vista previa"
            className="h-full w-full object-cover opacity-80"
          />
        </div>
      ) : null}

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || isProcessing}
        placeholder="¿Qué comiste? (opcional si adjuntás foto o voz)"
        className="min-h-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-snug text-zinc-100 placeholder:text-zinc-500 outline-none"
      />

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-zinc-800/60 px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={disabled || isProcessing || isRecording}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg text-zinc-400 transition-colors",
              "hover:bg-zinc-800/80 hover:text-zinc-200",
              modality === "imagen" && "text-emerald-400",
            )}
            aria-label="Subir imagen"
          >
            <ImageIcon className="size-4" />
          </button>
          <button
            type="button"
            disabled={disabled || isProcessing}
            onClick={onToggleRecord}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg transition-colors",
              isRecording
                ? "bg-red-500/20 text-red-400"
                : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200",
              modality === "audio" && !isRecording && "text-emerald-400",
            )}
            aria-label={isRecording ? "Detener grabación" : "Grabar audio"}
          >
            {isRecording ? (
              <SquareIcon className="size-3.5 fill-current" />
            ) : (
              <MicIcon className="size-4" />
            )}
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {isProcessing ? (
            <span className="flex items-center gap-1 truncate font-mono text-[10px] text-emerald-400/90">
              <Loader2Icon className="size-3 shrink-0 animate-spin" />
              {processingLabel ?? "Nutrimetron analizando..."}
            </span>
          ) : null}
          {audioReady && !isProcessing ? (
            <span className="font-mono text-[10px] text-zinc-500">
              Audio {audioDurationSec ?? 0}s
            </span>
          ) : null}
          {isRecording ? (
            <span className="font-mono text-[10px] text-red-400">REC</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
