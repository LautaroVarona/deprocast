"use client";

import {
  buildCaptureGravity,
  postIngestaCapture,
} from "@/components/ingesta/capture-client";
import { useBabel } from "@/components/babel/babel-context";
import { useVoiceRecorder } from "@/components/salud/hooks/use-voice-recorder";
import { Button } from "@/components/ui/button";
import { withUniverseFetchInit } from "@/lib/babel/universe-fetch";
import { CAPTURE_SUCCESS_TOAST } from "@/lib/purifier/constants";
import { cn } from "@/lib/utils";
import {
  Loader2Icon,
  MicIcon,
  SendHorizonalIcon,
  SquareIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

async function waitForTranscript(
  assetId: string,
  universeSlug: string | null | undefined,
  maxAttempts = 36,
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(
      `/api/assets`,
      withUniverseFetchInit({
        cache: "no-store",
        universeSlug,
      }),
    );
    if (response.ok) {
      const assets: Array<{
        id: string;
        transcript: { id: string } | null;
        status: string;
      }> = await response.json();
      const asset = assets.find((row) => row.id === assetId);
      if (asset?.transcript) return true;
      if (asset?.status === "ERROR") return false;
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  return false;
}

export function PulseInjection() {
  const { activeUniverse } = useBabel();
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    isRecording,
    audioBlob,
    durationSec,
    error: micError,
    toggleRecording,
    clearRecording,
  } = useVoiceRecorder();
  const pendingBlobRef = useRef(false);

  const submitText = useCallback(async () => {
    const content = text.trim();
    if (!content || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const data = await postIngestaCapture(
        {
          channel: "texto",
          rawText: content,
          gravity: buildCaptureGravity(
            {
              title: "",
              sourceType: "personal_writing",
              campoSlug: "babel",
              onda: "pulso-hud",
              locationName: "",
            },
            activeUniverse?.slug,
          ),
        },
        { universeSlug: activeUniverse?.slug },
      );

      setText("");
      toast.success(CAPTURE_SUCCESS_TOAST, {
        description: "Materia · texto_directo",
        action: {
          label: "Validar →",
          onClick: () => {
            window.location.href = `/validar?id=${data.reviewId}`;
          },
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo inyectar el pulso.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [text, isSubmitting, activeUniverse?.slug]);

  const submitAudioBlob = useCallback(
    async (blob: Blob) => {
      setIsSubmitting(true);
      try {
        const file = new File([blob], `pulso-${Date.now()}.webm`, {
          type: blob.type || "audio/webm",
        });
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sourceType", "personal_writing");
        formData.append("onda", "pulso-hud");
        formData.append("title", "Pulso de voz");

        const uploadRes = await fetch(
          "/api/upload",
          withUniverseFetchInit({
            method: "POST",
            universeSlug: activeUniverse?.slug,
            body: formData,
          }),
        );
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error ?? "No se pudo subir el audio.");
        }

        const assetId = uploadData.id as string;
        toast.message("STT en curso…", {
          description: "Esperando transcripción para purificar (stt_audio).",
        });

        const ready = await waitForTranscript(assetId, activeUniverse?.slug);
        if (!ready) {
          throw new Error(
            "La transcripción tarda demasiado. Revisá Ingesta → Audio.",
          );
        }

        const data = await postIngestaCapture(
          {
            channel: "audio",
            assetId,
            gravity: buildCaptureGravity(
              {
                title: "Pulso de voz",
                sourceType: "personal_writing",
                campoSlug: "babel",
                onda: "pulso-hud",
                locationName: "",
              },
              activeUniverse?.slug,
            ),
          },
          { universeSlug: activeUniverse?.slug },
        );

        clearRecording();
        toast.success(CAPTURE_SUCCESS_TOAST, {
          description: "Materia · stt_audio",
          action: {
            label: "Validar →",
            onClick: () => {
              window.location.href = `/validar?id=${data.reviewId}`;
            },
          },
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo inyectar el audio.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeUniverse?.slug, clearRecording],
  );

  useEffect(() => {
    if (!audioBlob || isRecording || !pendingBlobRef.current) return;
    pendingBlobRef.current = false;
    void submitAudioBlob(audioBlob);
  }, [audioBlob, isRecording, submitAudioBlob]);

  const handleMic = async () => {
    if (isSubmitting) return;
    if (isRecording) {
      pendingBlobRef.current = true;
      await toggleRecording();
      return;
    }
    clearRecording();
    pendingBlobRef.current = true;
    await toggleRecording();
  };

  return (
    <section className="relative w-full">
      <label className="mb-3 block font-mono text-[10px] tracking-[0.28em] text-amber-500/70 uppercase">
        Inyección de Pulso
      </label>

      <div
        className={cn(
          "flex items-stretch gap-2 rounded-2xl border border-amber-500/20 bg-black/40 p-2 shadow-[inset_0_1px_0_rgba(251,191,36,0.08)]",
          "focus-within:border-amber-400/40 focus-within:ring-1 focus-within:ring-amber-500/20",
        )}
      >
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void submitText();
            }
          }}
          rows={3}
          disabled={isSubmitting || isRecording}
          placeholder="¿Qué llevas en la mente, Lautaro?"
          className="min-h-[5.5rem] flex-1 resize-none bg-transparent px-3 py-3 text-lg leading-snug text-foreground placeholder:text-white/30 outline-none disabled:opacity-50 md:text-xl"
        />

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => void handleMic()}
            className={cn(
              "size-11 shrink-0 border-amber-500/30",
              isRecording &&
                "animate-pulse border-rose-400/50 bg-rose-500/20 text-rose-200",
            )}
            aria-label={isRecording ? "Detener grabación" : "Grabar audio"}
          >
            {isRecording ? (
              <SquareIcon className="size-4" />
            ) : (
              <MicIcon className="size-4" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            disabled={isSubmitting || isRecording || !text.trim()}
            onClick={() => void submitText()}
            className="size-11 shrink-0 bg-amber-600 text-black hover:bg-amber-500"
            aria-label="Inyectar texto"
          >
            {isSubmitting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendHorizonalIcon className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] text-white/35">
        <span>Ctrl/⌘ + Enter · texto_directo</span>
        {isRecording ? (
          <span className="text-rose-300/80">Grabando {durationSec}s…</span>
        ) : null}
        {micError ? <span className="text-rose-400">{micError}</span> : null}
      </div>
    </section>
  );
}
