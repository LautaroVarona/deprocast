"use client";

import { withUniverseFetchInit } from "@/lib/babel/universe-fetch";
import { UPLOAD_CHUNK_BYTES } from "@/lib/audio-upload/constants";
import {
  DISTILL_STATIONS,
  type DistillStation,
} from "@/lib/audio-upload/constants";
import type { DistillStepperState } from "@/lib/audio-station/pipeline-status";
import { buildDistillStepper } from "@/lib/audio-station/pipeline-status";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useId,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

type UploadDropzoneProps = {
  onUploaded: (result?: { jobId?: string }) => void;
  variant?: "default" | "embedded" | "hud" | "crisol";
  universeSlug?: string | null;
  /** Cards de assets ya en pipeline (rack del Crisol). */
  children?: ReactNode;
  /** Hay materia en el rack (assets filtrados). */
  hasRackItems?: boolean;
};

export type FileUploadState = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  errorCode?: number;
  progress?: string;
  chunkIndex?: number;
  totalChunks?: number;
  assetId?: string;
  uploadId?: string;
};

const SHORT_GLYPH: Record<DistillStation, string> = {
  STT: "STT",
  LINEAGE: "LIN",
  QUANT: "QNT",
  VECTORS: "VCT",
  HITL: "HTL",
  COAG: "COG",
};

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function MicroStationRow({ distill }: { distill: DistillStepperState }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 font-mono text-[9px] tracking-tight">
      {DISTILL_STATIONS.map((station, index) => {
        const state = distill.steps[station];
        return (
          <span key={station} className="inline-flex items-center gap-1">
            <span
              className={cn(
                state === "done" && "text-emerald-500",
                state === "active" && "animate-pulse text-[#FFB000]",
                state === "error" && "text-red-500",
                state === "idle" && "text-zinc-600",
              )}
            >
              {SHORT_GLYPH[station]}
            </span>
            {index < DISTILL_STATIONS.length - 1 ? (
              <span className="text-zinc-700">|</span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export function CrisolMicroCard({ item }: { item: FileUploadState }) {
  const isErr = item.status === "error";
  const distill = buildDistillStepper({
    pipelineStation: isErr
      ? "ERROR"
      : item.status === "done"
        ? "STT"
        : "QUEUED",
    pipelineError: item.errorCode === 413 ? "413" : item.error,
    status: isErr ? "ERROR" : "PENDING",
  });

  const consoleLine = isErr
    ? item.errorCode === 413
      ? "[ERR: 413]"
      : `[ERR: ${(item.error ?? "FAIL").slice(0, 36)}]`
    : item.status === "done"
      ? "[CHUNK OK · EN COLA STT]"
      : `[CHUNK ${item.chunkIndex ?? 0}/${item.totalChunks ?? "?"}: ENSAMBLANDO]`;

  return (
    <article
      className={cn(
        "flex h-32 flex-col justify-between border bg-zinc-950 p-3 font-mono rounded-none transition-colors",
        isErr
          ? "border-red-900"
          : "border-zinc-800 hover:border-[#FFB000]/30",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <p className="truncate text-xs text-zinc-400">{item.file.name}</p>
        <span className="shrink-0 text-[10px] text-zinc-600">
          {formatBytes(item.file.size)}
        </span>
      </header>

      <MicroStationRow distill={distill} />

      <p
        className={cn(
          "text-[10px] uppercase tracking-wide",
          isErr ? "text-red-500" : "text-zinc-600",
          item.status === "uploading" && "animate-pulse text-[#FFB000]/80",
        )}
      >
        {consoleLine}
      </p>
    </article>
  );
}

async function uploadFileInChunks(
  file: File,
  universeSlug?: string | null,
  onProgress?: (label: string, chunkIndex: number, totalChunks: number) => void,
): Promise<{ assetId: string; jobId: string }> {
  const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_BYTES));
  const uploadId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  onProgress?.(`init 0/${totalChunks}`, 0, totalChunks);

  // Init best-effort (chunk auto-inicializa si falla)
  try {
    const initForm = new FormData();
    initForm.append("uploadId", uploadId);
    initForm.append("filename", file.name);
    initForm.append("mimeType", file.type || "");
    initForm.append("totalChunks", String(totalChunks));
    initForm.append("ambientContext", "caminata");
    initForm.append("lastModified", String(file.lastModified || Date.now()));

    await fetch(
      "/api/molecular/init",
      withUniverseFetchInit({
        method: "POST",
        universeSlug,
        body: initForm,
      }),
    );
  } catch {
    // El primer chunk creará la sesión en tmp/
  }

  let assetId = uploadId;

  for (let index = 0; index < totalChunks; index += 1) {
    const start = index * UPLOAD_CHUNK_BYTES;
    const end = Math.min(start + UPLOAD_CHUNK_BYTES, file.size);
    const blob = file.slice(start, end);

    onProgress?.(`chunk ${index + 1}/${totalChunks}`, index + 1, totalChunks);

    const chunkForm = new FormData();
    chunkForm.append("uploadId", uploadId);
    chunkForm.append("filename", file.name);
    chunkForm.append("mimeType", file.type || "");
    chunkForm.append("chunkIndex", String(index));
    chunkForm.append("index", String(index));
    chunkForm.append("totalChunks", String(totalChunks));
    chunkForm.append("total", String(totalChunks));
    chunkForm.append("ambientContext", "caminata");
    chunkForm.append("lastModified", String(file.lastModified || Date.now()));
    chunkForm.append("chunk", blob, `${file.name}.part${index}`);

    const chunkRes = await fetch(
      "/api/molecular/chunk",
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
    if (typeof chunkData.assetId === "string") {
      assetId = chunkData.assetId;
    }
  }

  onProgress?.("complete", totalChunks, totalChunks);

  const completeForm = new FormData();
  completeForm.append("uploadId", uploadId);
  completeForm.append("filename", file.name);

  const completeRes = await fetch(
    "/api/molecular/complete",
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
  variant = "crisol",
  universeSlug,
  children,
  hasRackItems = false,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const isUploading = uploads.some((item) => item.status === "uploading");
  const hasUploads = uploads.length > 0;
  const showGrid = hasUploads || hasRackItems || Boolean(children);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      const initial: FileUploadState[] = files.map((file) => ({
        file,
        status: "pending" as const,
        totalChunks: Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_BYTES)),
        chunkIndex: 0,
      }));

      let startIndex = 0;
      setUploads((prev) => {
        startIndex = prev.length;
        return [...prev, ...initial];
      });

      // Esperar un tick para que startIndex quede fijado tras el setState sync path
      await Promise.resolve();

      let successCount = 0;
      let errorCount = 0;
      let lastJobId: string | undefined;

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!;
        const slot = startIndex + index;

        setUploads((current) =>
          current.map((item, itemIndex) =>
            itemIndex === slot
              ? { ...item, status: "uploading", progress: "init" }
              : item,
          ),
        );

        try {
          const result = await uploadFileInChunks(
            file,
            universeSlug,
            (label, chunkIndex, totalChunks) => {
              setUploads((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === slot
                    ? { ...item, progress: label, chunkIndex, totalChunks }
                    : item,
                ),
              );
            },
          );

          successCount += 1;
          lastJobId = result.jobId;
          setUploads((current) =>
            current.map((item, itemIndex) =>
              itemIndex === slot
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
              itemIndex === slot
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
            ? "Materia en el Atanor. Destilación iniciada."
            : `${successCount} audios en el Crisol.`,
        );
      }

      if (errorCount > 0) {
        toast.error(
          errorCount === 1
            ? "1 archivo falló al subir"
            : `${errorCount} archivos fallaron al subir`,
        );
      }

      setTimeout(() => {
        setUploads((current) =>
          current.filter(
            (item) =>
              item.status === "uploading" || item.status === "pending",
          ),
        );
      }, 8000);
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
    onDragLeave: (event: DragEvent) => {
      // Evitar flicker al cruzar hijos
      if (event.currentTarget.contains(event.relatedTarget as Node)) return;
      setIsDragging(false);
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
  };

  const fileInput = (
    <input
      id={inputId}
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

  // ── CRISOL UNIFICADO ──────────────────────────────────────
  if (variant === "crisol" || variant === "hud" || variant === "default" || variant === "embedded") {
    return (
      <div
        className={cn(
          "relative min-h-[70vh] w-full border-2 border-dashed bg-zinc-950/40 p-8 transition-colors rounded-none",
          isDragging
            ? "border-[#FFB000]/60 bg-[#FFB000]/5"
            : "border-zinc-800",
        )}
        {...dropHandlers}
        onClick={(event) => {
          // Click en vacío abre file picker; no si clickea una card
          if (event.target === event.currentTarget && !isUploading) {
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label="Crisol de destilación — soltá audios aquí"
      >
        {fileInput}

        {!showGrid ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="font-mono text-sm tracking-[0.12em] text-zinc-600">
              [ATANOR: ARRASTRA LA MATERIA PRIMA AQUÍ]
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 content-start items-start gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {uploads.map((item) => (
              <CrisolMicroCard
                key={`${item.file.name}-${item.file.size}-${item.uploadId ?? item.assetId ?? "u"}`}
                item={item}
              />
            ))}
            {children}
          </div>
        )}

        <button
          type="button"
          className="absolute bottom-3 right-3 border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-zinc-500 hover:border-[#FFB000]/40 hover:text-[#FFB000] rounded-none"
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
        >
          [SELECCIONAR]
        </button>
      </div>
    );
  }

  return null;
}

export { MicroStationRow };
