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

const SUCCESS_FLASH_MS = 2000;

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
  const [successFlash, setSuccessFlash] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    isRecording,
    audioBlob,
    durationSec,
    error: micError,
    toggleRecording,
    clearRecording,
  } = useVoiceRecorder();
  const pendingBlobRef = useRef(false);

  const triggerSuccessFlash = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    setSuccessFlash(true);
    successTimerRef.current = setTimeout(() => {
      setSuccessFlash(false);
      successTimerRef.current = null;
    }, SUCCESS_FLASH_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

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
      triggerSuccessFlash();
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
  }, [text, isSubmitting, activeUniverse?.slug, triggerSuccessFlash]);

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
        triggerSuccessFlash();
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
    [activeUniverse?.slug, clearRecording, triggerSuccessFlash],
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
      <label className="mb-3 block font-mono text-[10px] tracking-[0.28em] text-accent uppercase">
        Inyección de Pulso
      </label>

      <div
        className={cn(
          "flex items-stretch gap-2 rounded-2xl border border-accent/20 bg-card/80 p-2 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--accent)_8%,transparent)]",
          "focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/20",
          successFlash && "border-primary/40",
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
          placeholder="¿Qué llevas en la mente, Operador?"
          className="min-h-[5.5rem] flex-1 resize-none bg-transparent px-3 py-3 text-lg leading-snug text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 md:text-xl"
        />

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => void handleMic()}
            className={cn(
              "size-11 shrink-0 border-accent/30",
              isRecording &&
                "animate-pulse border-destructive/50 bg-destructive/20 text-destructive",
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
            disabled={
              isSubmitting ||
              isRecording ||
              successFlash ||
              !text.trim()
            }
            onClick={() => void submitText()}
            className={cn(
              "size-11 shrink-0 bg-accent text-accent-foreground hover:bg-accent/90",
              successFlash && "bg-primary hover:bg-primary",
            )}
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

      <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted-foreground">
        {successFlash ? (
          <span className="tracking-[0.18em] text-chart-3 uppercase">
            [ INYECCIÓN EXITOSA ]
          </span>
        ) : isSubmitting ? (
          <span className="tracking-[0.18em] text-accent uppercase">
            [ CAPTURANDO… ]
          </span>
        ) : (
          <span>Ctrl/⌘ + Enter · texto_directo</span>
        )}
        {isRecording ? (
          <span className="text-destructive/80">Grabando {durationSec}s…</span>
        ) : null}
        {micError ? <span className="text-destructive">{micError}</span> : null}
      </div>
    </section>
  );
}
