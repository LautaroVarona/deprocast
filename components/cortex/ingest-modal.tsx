"use client";

import { buildCaptureGravity, postIngestaCapture } from "@/components/ingesta/capture-client";
import { useBabel } from "@/components/babel/babel-context";
import { Button } from "@/components/ui/button";
import { withUniverseFetchInit } from "@/lib/babel/universe-fetch";
import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  FileTextIcon,
  Loader2Icon,
  UploadCloudIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

type IngestModalProps = {
  open: boolean;
  onClose: () => void;
  onIngested: () => void;
};

type IngestTab = "archivos" | "texto";

type FileUploadState = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

const AUDIO_EXTENSIONS = [".mp3", ".m4a", ".wav", ".ogg"];
const TEXT_EXTENSIONS = [".txt", ".md", ".doc", ".docx"];

function isAudioFile(name: string): boolean {
  const lower = name.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isTextDocument(name: string): boolean {
  const lower = name.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

async function uploadAudio(file: File, universeSlug?: string | null): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    "/api/upload",
    withUniverseFetchInit({
      method: "POST",
      universeSlug,
      body: formData,
    }),
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo subir el audio");
  }
}

async function ingestTextFile(
  file: File,
  universeSlug?: string | null,
): Promise<void> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) {
    throw new Error(
      "Los archivos Word binarios requieren la ingesta avanzada. Convertí a .txt o usá /ingesta.",
    );
  }

  const text = await file.text();
  if (!text.trim()) {
    throw new Error("El archivo está vacío");
  }

  await postIngestaCapture(
    {
      channel: "texto",
      rawText: text,
      filename: file.name,
      gravity: buildCaptureGravity(
        {
          title: "",
          sourceType: "personal_writing",
          campoSlug: "babel",
          onda: "cortex-ingest",
        },
        universeSlug,
      ),
    },
    { universeSlug },
  );
}

async function ingestTextDump(
  content: string,
  universeSlug?: string | null,
): Promise<void> {
  await postIngestaCapture(
    {
      channel: "texto",
      rawText: content,
      gravity: buildCaptureGravity(
        {
          title: "",
          sourceType: "ai_chat",
          campoSlug: "babel",
          onda: "cortex-dump",
        },
        universeSlug,
      ),
    },
    { universeSlug },
  );
}

export function IngestModal({ open, onClose, onIngested }: IngestModalProps) {
  const { activeUniverse } = useBabel();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<IngestTab>("archivos");
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const [textContent, setTextContent] = useState("");
  const [isSubmittingText, setIsSubmittingText] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isUploading = uploads.some((item) => item.status === "uploading");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const processFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      const initial: FileUploadState[] = files.map((file) => ({
        file,
        status: "pending",
      }));
      setUploads(initial);

      let successCount = 0;

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];

        setUploads((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index ? { ...item, status: "uploading" } : item,
          ),
        );

        try {
          if (isAudioFile(file.name)) {
            await uploadAudio(file, activeUniverse?.slug);
          } else if (isTextDocument(file.name)) {
            await ingestTextFile(file, activeUniverse?.slug);
          } else {
            throw new Error(
              "Formato no soportado. Usá audio (.mp3, .m4a, .wav, .ogg) o documento (.txt, .md, .doc, .docx).",
            );
          }

          successCount += 1;
          setUploads((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index ? { ...item, status: "done" } : item,
            ),
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "No se pudo ingestar el archivo";

          setUploads((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index
                ? { ...item, status: "error", error: message }
                : item,
            ),
          );
        }
      }

      if (successCount > 0) {
        onIngested();
        toast.success(
          successCount === 1
            ? "1 estímulo ingestado correctamente"
            : `${successCount} estímulos ingestados correctamente`,
        );
        setTimeout(() => {
          setUploads([]);
          onClose();
        }, 1200);
      }
    },
    [activeUniverse?.slug, onClose, onIngested],
  );

  const handleTextSubmit = async () => {
    if (!textContent.trim() || isSubmittingText) return;

    setIsSubmittingText(true);
    try {
      await ingestTextDump(textContent.trim(), activeUniverse?.slug);
      onIngested();
      toast.success("Dump de texto capturado", {
        description: "Purificación en curso en el Atanor.",
      });
      setTextContent("");
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo capturar el dump de texto";
      toast.error(message);
    } finally {
      setIsSubmittingText(false);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm dark:bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ingest-modal-title"
        className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2
              id="ingest-modal-title"
              className="text-base font-semibold tracking-tight"
            >
              Ingestar Data
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Audios, memorias Word o dumps planos de chat
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="shrink-0 text-muted-foreground"
          >
            <XIcon />
          </Button>
        </div>

        <div className="flex gap-1 border-b border-border px-5 pt-2">
          {(
            [
              { id: "archivos" as const, label: "Archivos" },
              { id: "texto" as const, label: "Dump de texto" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                tab === item.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4">
          {tab === "archivos" ? (
            <div
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center transition-colors",
                isDragging && "border-primary/50 bg-primary/5",
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                void processFiles(Array.from(event.dataTransfer.files));
              }}
            >
              {isUploading ? (
                <Loader2Icon className="size-10 animate-spin text-primary" />
              ) : (
                <UploadCloudIcon className="size-10 text-muted-foreground" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Arrastrá archivos o seleccioná desde tu disco
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Audio: .mp3 · .m4a · .wav · .ogg — Docs: .txt · .md · .doc ·
                  .docx
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={isUploading}
                onClick={() => inputRef.current?.click()}
              >
                Seleccionar archivos
              </Button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".mp3,.m4a,.wav,.ogg,audio/*,.txt,.md,.doc,.docx"
                className="hidden"
                onChange={(event) => {
                  const files = event.target.files;
                  if (files?.length) void processFiles(Array.from(files));
                  event.target.value = "";
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={textContent}
                onChange={(event) => setTextContent(event.target.value)}
                placeholder="Pegá acá el historial completo de ChatGPT, Gemini u otro dump plano…"
                className="min-h-48 w-full resize-none rounded-xl border border-input bg-muted/30 px-3 py-2.5 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                  <FileTextIcon className="size-3" />
                  {textContent.trim().length > 0
                    ? `${textContent.trim().length.toLocaleString("es-AR")} caracteres`
                    : "El purificador estructurará el contenido automáticamente"}
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={!textContent.trim() || isSubmittingText}
                  onClick={() => void handleTextSubmit()}
                >
                  {isSubmittingText ? (
                    <Loader2Icon className="animate-spin" />
                  ) : null}
                  {isSubmittingText ? "Capturando…" : "Ingestar dump"}
                </Button>
              </div>
            </div>
          )}

          {uploads.length > 0 && tab === "archivos" && (
            <ul className="mt-4 space-y-1.5">
              {uploads.map((item) => (
                <li
                  key={`${item.file.name}-${item.file.size}`}
                  className="flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-xs"
                >
                  {item.status === "uploading" && (
                    <Loader2Icon className="size-3.5 shrink-0 animate-spin text-primary" />
                  )}
                  {item.status === "done" && (
                    <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-500" />
                  )}
                  {item.status === "error" && (
                    <XCircleIcon className="size-3.5 shrink-0 text-destructive" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                  {item.error && (
                    <span className="text-[10px] text-destructive">{item.error}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
