"use client";

import { DistillationStepper } from "@/components/audio-station/distillation-stepper";
import { withUniverseFetchInit } from "@/lib/babel/universe-fetch";
import { UPLOAD_CHUNK_BYTES } from "@/lib/audio-upload/constants";
import { buildDistillStepper } from "@/lib/audio-station/pipeline-status";
import { cn } from "@/lib/utils";
import { useCallback, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";

type UploadDropzoneProps = {
  onUploaded: (result?: { jobId?: string }) => void;
  variant?: "default" | "embedded";
  universeSlug?: string | null;
};

type FileUploadState = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  errorCode?: number;
  progress?: string;
  assetId?: string;
};

async function uploadFileInChunks(
  file: File,
  universeSlug?: string | null,
  onProgress?: (label: string) => void,
): Promise<{ assetId: string; jobId: string }> {
  const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_BYTES));

  onProgress?.(`init 0/${totalChunks}`);

  const initForm = new FormData();
  initForm.append("filename", file.name);
  initForm.append("mimeType", file.type || "");
  initForm.append("totalChunks", String(totalChunks));
  initForm.append("ambientContext", "caminata");

  const initRes = await fetch(
    "/api/upload/init",
    withUniverseFetchInit({
      method: "POST",
      universeSlug,
      body: initForm,
    }),
  );
  const initData = await initRes.json();
  if (!initRes.ok) {
    const err = new Error(initData.error ?? "No se pudo iniciar la subida") as Error & {
      status?: number;
    };
    err.status = initRes.status;
    throw err;
  }

  const uploadId = initData.uploadId as string;
  const assetId = initData.assetId as string;

  for (let index = 0; index < totalChunks; index += 1) {
    const start = index * UPLOAD_CHUNK_BYTES;
    const end = Math.min(start + UPLOAD_CHUNK_BYTES, file.size);
    const blob = file.slice(start, end);

    onProgress?.(`chunk ${index + 1}/${totalChunks}`);

    const chunkForm = new FormData();
    chunkForm.append("uploadId", uploadId);
    chunkForm.append("index", String(index));
    chunkForm.append("total", String(totalChunks));
    chunkForm.append("chunk", blob, `${file.name}.part${index}`);

    const chunkRes = await fetch(
      "/api/upload/chunk",
      withUniverseFetchInit({
        method: "POST",
        universeSlug,
        body: chunkForm,
      }),
    );
    const chunkData = await chunkRes.json().catch(() => ({}));
    if (!chunkRes.ok) {
      const err = new Error(
        chunkData.error ?? `Chunk ${index + 1} falló`,
      ) as Error & { status?: number };
      err.status = chunkRes.status;
      throw err;
    }
  }

  onProgress?.("complete");

  const completeForm = new FormData();
  completeForm.append("uploadId", uploadId);

  const completeRes = await fetch(
    "/api/upload/complete",
    withUniverseFetchInit({
      method: "POST",
      universeSlug,
      body: completeForm,
    }),
  );
  const completeData = await completeRes.json();
  if (!completeRes.ok) {
    const err = new Error(
      completeData.error ?? "No se pudo completar la subida",
    ) as Error & { status?: number };
    err.status = completeRes.status;
    throw err;
  }

  return {
    assetId: completeData.id ?? assetId,
    jobId: completeData.jobId ?? assetId,
  };
}

export function UploadDropzone({
  onUploaded,
  variant = "default",
  universeSlug,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const isUploading = uploads.some((item) => item.status === "uploading");
  const hasQueue = uploads.length > 0;

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      const initial: FileUploadState[] = files.map((file) => ({
        file,
        status: "pending",
      }));

      setUploads(initial);

      let successCount = 0;
      let errorCount = 0;
      let lastJobId: string | undefined;

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!;

        setUploads((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index
              ? { ...item, status: "uploading", progress: "init" }
              : item,
          ),
        );

        try {
          const result = await uploadFileInChunks(
            file,
            universeSlug,
            (label) => {
              setUploads((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index
                    ? { ...item, progress: label }
                    : item,
                ),
              );
            },
          );

          successCount += 1;
          lastJobId = result.jobId;
          setUploads((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index
                ? {
                    ...item,
                    status: "done",
                    assetId: result.assetId,
                    progress: "STT",
                  }
                : item,
            ),
          );
        } catch (error) {
          errorCount += 1;
          const status =
            error && typeof error === "object" && "status" in error
              ? Number((error as { status?: number }).status)
              : undefined;
          const message =
            error instanceof Error
              ? error.message
              : "No se pudo subir el archivo";

          setUploads((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index
                ? {
                    ...item,
                    status: "error",
                    error: message,
                    errorCode: status,
                  }
                : item,
            ),
          );
        }
      }

      if (successCount > 0) {
        onUploaded({ jobId: lastJobId });
        toast.success(
          successCount === 1
            ? "Audio en el Atanor. Destilación iniciada."
            : `${successCount} audios en cola de destilación.`,
        );
      }

      if (errorCount > 0) {
        toast.error(
          errorCount === 1
            ? "1 archivo falló al subir"
            : `${errorCount} archivos fallaron al subir`,
        );
      }

      setTimeout(() => setUploads([]), 8000);
    },
    [onUploaded, universeSlug],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      void uploadFiles(Array.from(files));
    },
    [uploadFiles],
  );

  const dropHandlers = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: () => setIsDragging(false),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept=".mp3,.m4a,.wav,.ogg,audio/*"
      className="hidden"
      onChange={(event) => {
        handleFiles(event.target.files);
        event.target.value = "";
      }}
    />
  );

  const queueFeed =
    uploads.length > 0 ? (
      <ul className="w-full space-y-1">
        {uploads.map((item) => {
          const isErr = item.status === "error";
          const distill = buildDistillStepper({
            pipelineStation: isErr
              ? "ERROR"
              : item.status === "done"
                ? "STT"
                : "QUEUED",
            pipelineError:
              item.errorCode === 413
                ? "413"
                : item.error,
            status: isErr ? "ERROR" : "PENDING",
          });

          return (
            <li
              key={`${item.file.name}-${item.file.size}`}
              className={cn(
                "flex items-center gap-3 border bg-zinc-950 px-3 py-1.5",
                isErr ? "border-red-900" : "border-zinc-800",
              )}
            >
              <span className="truncate max-w-[180px] text-xs font-mono text-zinc-400">
                {item.file.name}
              </span>
              <DistillationStepper distill={distill} className="ml-auto" />
              {item.status === "uploading" && item.progress && (
                <span className="shrink-0 font-mono text-[9px] text-amber-500/80">
                  {item.progress}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    ) : null;

  // Compacto cuando hay cola o subidas
  if (hasQueue || variant === "embedded") {
    return (
      <div className="space-y-2">
        <div
          className={cn(
            "flex h-12 cursor-pointer items-center justify-between border bg-zinc-950 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 transition-colors rounded-none",
            isDragging || isUploading
              ? "animate-pulse border-amber-500/30 text-amber-500"
              : "border-zinc-800 hover:border-amber-500/40",
          )}
          {...dropHandlers}
          onClick={() => !isUploading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <span>
            {isUploading
              ? "[ATANOR: RECIBIENDO…]"
              : hasQueue
                ? "[ATANOR: DESTILANDO]"
                : "[ATANOR: ESPERANDO MATERIA PRIMA]"}
          </span>
          <span className="text-zinc-600">.mp3 · .m4a · .wav · .ogg</span>
          {fileInput}
        </div>
        {queueFeed}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 border border-dashed border-zinc-800 bg-zinc-950 px-6 py-10 text-center transition-colors rounded-none",
        isDragging && "border-amber-500/40 bg-zinc-950",
      )}
      {...dropHandlers}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber-500">
        [ATANOR: ESPERANDO MATERIA PRIMA]
      </p>
      <p className="font-mono text-xs text-zinc-500">
        Arrastrá audios o seleccioná varios archivos · .mp3 · .m4a · .wav · .ogg
      </p>
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="border border-amber-500/40 bg-zinc-950 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-500 hover:bg-amber-500/10 disabled:opacity-50 rounded-none"
      >
        {isUploading ? "Subiendo…" : "Seleccionar archivos"}
      </button>
      {fileInput}
      {queueFeed}
    </div>
  );
}
