"use client";

import { AmazonaMultiSelect } from "@/components/proyectos/amazona-multi-select";
import {
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/proyectos/form-controls";
import { IngestaAnchorInput } from "@/components/proyectos/ingesta-anchor-input";
import { useVoiceRecorder } from "@/components/salud/hooks/use-voice-recorder";
import { Button } from "@/components/ui/button";
import { withUniverseFetchInit } from "@/lib/babel/universe-fetch";
import type { IdeateMention } from "@/lib/projects/ideate/schema";
import { cn } from "@/lib/utils";
import { Loader2Icon, MicIcon, SquareIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type IngestaCaptureValues = {
  title: string;
  brainDump: string;
  amazonAResourceIds: string[];
  mentions: IdeateMention[];
};

type IngestaCaptureFormProps = {
  values: IngestaCaptureValues;
  onChange: (values: IngestaCaptureValues) => void;
  onProcess: () => void;
  onSaveEmpty: () => void;
  isBusy?: boolean;
  universeSlug?: string | null;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{
          isFinal?: boolean;
          0: { transcript: string };
        }> & { length: number };
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

async function waitForTranscriptText(
  assetId: string,
  universeSlug: string | null | undefined,
  maxAttempts = 24,
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(
      "/api/assets",
      withUniverseFetchInit({ cache: "no-store", universeSlug }),
    );
    if (response.ok) {
      const assets: Array<{
        id: string;
        status: string;
        transcript: { id: string; preview?: string } | null;
      }> = await response.json();
      const asset = assets.find((row) => row.id === assetId);
      if (asset?.status === "ERROR") return null;
      if (asset?.transcript) {
        const dl = await fetch(`/api/transcripts/${assetId}/download`);
        if (dl.ok) {
          const md = await dl.text();
          // Strip YAML frontmatter if present; keep body text.
          const parts = md.split(/^---\s*$/m);
          const body =
            parts.length >= 3 ? parts.slice(2).join("---").trim() : md.trim();
          if (body) return body;
        }
        if (asset.transcript.preview) {
          return asset.transcript.preview.replace(/…$/, "").trim();
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return null;
}

export function IngestaCaptureForm({
  values,
  onChange,
  onProcess,
  onSaveEmpty,
  isBusy = false,
  universeSlug,
}: IngestaCaptureFormProps) {
  const [isDictating, setIsDictating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const {
    isRecording,
    audioBlob,
    durationSec,
    error: micError,
    toggleRecording,
    clearRecording,
  } = useVoiceRecorder();
  const pendingUploadRef = useRef(false);

  const patch = useCallback(
    (partial: Partial<IngestaCaptureValues>) => {
      onChange({ ...values, ...partial });
    },
    [onChange, values],
  );

  const appendDump = useCallback(
    (text: string) => {
      const chunk = text.trim();
      if (!chunk) return;
      const next = values.brainDump.trim()
        ? `${values.brainDump.trim()}\n${chunk}`
        : chunk;
      patch({ brainDump: next });
    },
    [patch, values.brainDump],
  );

  const stopBrowserDictation = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsDictating(false);
  }, []);

  const startBrowserDictation = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return false;

    const recognition = new Ctor();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result?.isFinal === false) continue;
        const piece = result?.[0]?.transcript?.trim();
        if (piece) appendDump(piece);
      }
    };
    recognition.onerror = () => {
      setIsDictating(false);
      toast.error("Error de dictado del navegador.");
    };
    recognition.onend = () => {
      setIsDictating(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsDictating(true);
    return true;
  }, [appendDump]);

  const handleMic = useCallback(async () => {
    if (isDictating) {
      stopBrowserDictation();
      return;
    }
    if (isRecording) {
      toggleRecording();
      return;
    }
    const started = startBrowserDictation();
    if (started) return;
    pendingUploadRef.current = true;
    await toggleRecording();
  }, [
    isDictating,
    isRecording,
    startBrowserDictation,
    stopBrowserDictation,
    toggleRecording,
  ]);

  useEffect(() => {
    if (!audioBlob || isRecording || !pendingUploadRef.current) return;
    pendingUploadRef.current = false;

    void (async () => {
      setIsTranscribing(true);
      try {
        const file = new File([audioBlob], `ideate-${Date.now()}.webm`, {
          type: audioBlob.type || "audio/webm",
        });
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sourceType", "personal_writing");
        formData.append("onda", "ideate-brain-dump");
        formData.append("title", values.title || "Brain dump");

        const uploadRes = await fetch(
          "/api/upload",
          withUniverseFetchInit({
            method: "POST",
            universeSlug,
            body: formData,
          }),
        );
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error ?? "No se pudo subir el audio.");
        }

        toast.message("STT en curso…", {
          description: "Esperando transcripción para el brain dump.",
        });

        const text = await waitForTranscriptText(uploadData.id, universeSlug);
        if (!text) {
          throw new Error(
            "La transcripción tarda demasiado. Revisá Ingesta → Audio.",
          );
        }
        appendDump(text);
        toast.success("Dictado anexado al brain dump.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Falló el dictado por audio.",
        );
      } finally {
        clearRecording();
        setIsTranscribing(false);
      }
    })();
  }, [
    audioBlob,
    isRecording,
    universeSlug,
    values.title,
    appendDump,
    clearRecording,
  ]);

  useEffect(() => {
    if (micError) toast.error(micError);
  }, [micError]);

  useEffect(() => {
    return () => {
      stopBrowserDictation();
    };
  }, [stopBrowserDictation]);

  const canSubmit = values.title.trim().length > 0 && !isBusy && !isTranscribing;

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5">
      <FormField id="ideate-title" label="Nombre del proyecto" hint="*">
        <input
          id="ideate-title"
          value={values.title}
          disabled={isBusy}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Título obligatorio"
          className={inputClassName}
          autoFocus
        />
      </FormField>

      <FormField id="ideate-dump" label="Brain Dump" hint="texto libre">
        <div className="relative">
          <textarea
            id="ideate-dump"
            value={values.brainDump}
            disabled={isBusy}
            onChange={(e) => patch({ brainDump: e.target.value })}
            placeholder="Vaciá contexto, ideas, restricciones, stakeholders…"
            rows={8}
            className={cn(textareaClassName, "min-h-[160px] pr-12")}
          />
          <Button
            type="button"
            size="icon-sm"
            variant={isDictating || isRecording ? "default" : "outline"}
            disabled={isBusy || isTranscribing}
            className="absolute top-2 right-2"
            onClick={() => void handleMic()}
            aria-label={
              isDictating || isRecording ? "Detener dictado" : "Dictar por voz"
            }
          >
            {isTranscribing ? (
              <Loader2Icon className="animate-spin" />
            ) : isDictating || isRecording ? (
              <SquareIcon />
            ) : (
              <MicIcon />
            )}
          </Button>
        </div>
        {(isDictating || isRecording) && (
          <p className="font-mono text-[10px] text-muted-foreground">
            {isDictating
              ? "Dictado en vivo…"
              : `Grabando ${durationSec}s…`}
          </p>
        )}
      </FormField>

      <FormField label="Arsenal AmazonA" hint="multi-select">
        <AmazonaMultiSelect
          selectedIds={values.amazonAResourceIds}
          onChange={(amazonAResourceIds) => patch({ amazonAResourceIds })}
          disabled={isBusy}
        />
      </FormField>

      <FormField label="Anclaje rápido" hint="@ personas · # campos/áreas">
        <IngestaAnchorInput
          mentions={values.mentions}
          onChange={(mentions) => patch({ mentions })}
          disabled={isBusy}
        />
      </FormField>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={!canSubmit}
          onClick={onSaveEmpty}
        >
          Guardar vacío
        </Button>
        <Button type="button" disabled={!canSubmit} onClick={onProcess}>
          {isBusy ? (
            <>
              <Loader2Icon className="animate-spin" />
              Destilando…
            </>
          ) : (
            "Procesar en el Atanor"
          )}
        </Button>
      </div>
    </div>
  );
}
