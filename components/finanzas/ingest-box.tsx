"use client";

import { useVoiceRecorder } from "@/components/salud/hooks/use-voice-recorder";
import type { InputModality } from "@/components/finanzas/types";
import { cn } from "@/lib/utils";
import { ImageIcon, Loader2Icon, MicIcon, SquareIcon } from "lucide-react";
import { useEffect, useRef } from "react";

type IngestBoxProps = {
  value: string;
  onChange: (value: string) => void;
  modality: InputModality;
  imagePreviewUrl?: string | null;
  isProcessing?: boolean;
  onImagePick: (file: File) => void;
  onAudioPick: (file: File) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export function IngestBox({
  value,
  onChange,
  modality,
  imagePreviewUrl,
  isProcessing,
  onImagePick,
  onAudioPick,
  onSubmit,
  disabled,
}: IngestBoxProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, audioBlob, durationSec, toggleRecording } = useVoiceRecorder();
  const processedAudioRef = useRef<Blob | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (audioBlob && !isRecording && audioBlob !== processedAudioRef.current) {
      processedAudioRef.current = audioBlob;
      onAudioPick(new File([audioBlob], "nota-finanzas.webm", { type: "audio/webm" }));
    }
  }, [audioBlob, isRecording, onAudioPick]);

  return (
    <div className="finanzas-noir-panel overflow-hidden rounded-xl">
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
        <div className="relative h-20 shrink-0 overflow-hidden border-b border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreviewUrl}
            alt="Vista previa"
            className="h-full w-full object-cover opacity-70"
          />
        </div>
      ) : null}

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || isProcessing}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Gasté 45€ en Cursor para Deprocast… (⌘↵ para enviar)"
        className="min-h-[88px] w-full resize-none bg-transparent px-4 py-3 text-sm leading-snug text-foreground placeholder:text-muted-foreground outline-none"
      />

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled || isProcessing || isRecording}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
              modality === "image" && "text-emerald-400",
            )}
            aria-label="Subir captura"
          >
            <ImageIcon className="size-4" />
          </button>
          <button
            type="button"
            disabled={disabled || isProcessing}
            onClick={() => void toggleRecording()}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg transition-colors",
              isRecording
                ? "bg-red-500/20 text-red-400"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              modality === "audio" && !isRecording && "text-emerald-400",
            )}
            aria-label={isRecording ? "Detener grabación" : "Dictar"}
          >
            {isRecording ? (
              <SquareIcon className="size-3.5 fill-current" />
            ) : (
              <MicIcon className="size-4" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isProcessing ? (
            <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400/90">
              <Loader2Icon className="size-3 animate-spin" />
              financial-broker analizando…
            </span>
          ) : isRecording ? (
            <span className="font-mono text-[10px] text-red-400/90">
              {durationSec}s
            </span>
          ) : null}
          <button
            type="button"
            disabled={disabled || isProcessing}
            onClick={onSubmit}
            className="rounded-lg bg-emerald-500/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-40"
          >
            Analizar
          </button>
        </div>
      </div>
    </div>
  );
}
