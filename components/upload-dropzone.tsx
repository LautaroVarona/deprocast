"use client";

import { withUniverseFetchInit } from "@/lib/babel/universe-fetch";
import {
  UPLOAD_CHUNK_BYTES,
  UPLOAD_SINGLE_SHOT_MAX_BYTES,
} from "@/lib/audio-upload/constants";
import type { DistillStepperState } from "@/lib/audio-station/pipeline-status";
import { buildDistillStepper } from "@/lib/audio-station/pipeline-status";
import { MicroStationRow } from "@/components/audio-station/micro-station-row";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
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
  /** Tablillas de assets ya en pipeline (rack del Altar). */
  children?: ReactNode;
  /** Hay materia en el rack (assets filtrados). */
  hasRackItems?: boolean;
  /** IDs ya visibles en el rack — se usan para retirar tablillas de subida. */
  rackAssetIds?: string[];
  /** Filtro activo distinto de "all" sin resultados. */
  emptyFilterLabel?: string | null;
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

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
      ? "[ERR: 413 · MISIVA RECHAZADA]"
      : `[ERR: ${(item.error ?? "FALLA").slice(0, 36)}]`
    : item.status === "done"
      ? "[MISIVA CONSAGRADA · ORÁCVLO]"
      : `[FRAGMENTVM ${item.chunkIndex ?? 0}/${item.totalChunks ?? "?"}]`;

  return (
    <article
      className={cn(
        "flex h-32 flex-col justify-between border border-b-4 bg-stone-800 p-3 font-mono rounded-none transition-colors",
        isErr
          ? "border-rose-800 border-b-rose-950"
          : "border-stone-700 border-b-stone-950 hover:border-amber-700/50",
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="flex items-start justify-between gap-2">
        <p className="truncate font-serif text-xs tracking-tight text-legion-bone">
          {item.file.name}
        </p>
        <span className="shrink-0 text-[10px] text-legion-patina">
          {formatBytes(item.file.size)}
        </span>
      </header>

      <MicroStationRow distill={distill} />

      <p
        className={cn(
          "text-[10px] uppercase tracking-wide",
          isErr ? "text-rose-800" : "text-legion-patina",
          item.status === "uploading" && "animate-pulse text-amber-500/90",
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
  const useSingleShot = file.size <= UPLOAD_SINGLE_SHOT_MAX_BYTES;
  const totalChunks = useSingleShot
    ? 1
    : Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_BYTES));
  const uploadId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  onProgress?.(`init 0/${totalChunks}`, 0, totalChunks);

  let assetId = uploadId;

  try {
    const initForm = new FormData();
    initForm.append("uploadId", uploadId);
    initForm.append("filename", file.name);
    initForm.append("mimeType", file.type || "");
    initForm.append("totalChunks", String(totalChunks));
    initForm.append("ambientContext", "caminata");
    initForm.append("lastModified", String(file.lastModified || Date.now()));

    const initRes = await fetch(
      "/api/molecular/init",
      withUniverseFetchInit({
        method: "POST",
        universeSlug,
        body: initForm,
      }),
    );
    const initData = await initRes.json().catch(() => ({}));
    if (initRes.ok && typeof initData.assetId === "string") {
      assetId = initData.assetId;
    }
  } catch {
    // El primer chunk / complete creará la sesión
  }

  if (!useSingleShot) {
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
  }

  onProgress?.("complete", totalChunks, totalChunks);

  const completeForm = new FormData();
  completeForm.append("uploadId", uploadId);
  completeForm.append("filename", file.name);
  completeForm.append("assetId", assetId);
  // Reenviar el archivo en complete: evita 404 por /tmp multi-instancia en Vercel.
  if (useSingleShot || file.size <= UPLOAD_SINGLE_SHOT_MAX_BYTES) {
    completeForm.append("file", file, file.name);
  }

  const completeRes = await fetch(
    "/api/molecular/complete",
    withUniverseFetchInit({
      method: "POST",
      universeSlug,
      body: completeForm,
    }),
  );
  const completeData = await completeRes.json().catch(() => ({}));
  if (!completeRes.ok || completeData.ok === false) {
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
  rackAssetIds = [],
  emptyFilterLabel = null,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const isUploading = uploads.some((item) => item.status === "uploading");
  const hasUploads = uploads.length > 0;
  const showGrid = hasUploads || hasRackItems;

  // Retirar tablillas de subida solo cuando el rack ya muestra el asset.
  useEffect(() => {
    if (rackAssetIds.length === 0) return;
    const known = new Set(rackAssetIds);
    setUploads((current) =>
      current.filter(
        (item) =>
          item.status === "uploading" ||
          item.status === "pending" ||
          item.status === "error" ||
          !item.assetId ||
          !known.has(item.assetId),
      ),
    );
  }, [rackAssetIds]);

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
            ? "Misiva en el Altar. Oráculo iniciado."
            : `${successCount} misivas consagradas.`,
        );
      }

      if (errorCount > 0) {
        toast.error(
          errorCount === 1
            ? "1 misiva falló al depositarse"
            : `${errorCount} misivas fallaron`,
        );
      }
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

  if (
    variant === "crisol" ||
    variant === "hud" ||
    variant === "default" ||
    variant === "embedded"
  ) {
    return (
      <div
        className={cn(
          "relative flex min-h-[min(70vh,40rem)] w-full flex-col border-2 border-double bg-stone-900 p-6 transition-colors rounded-none sm:p-8",
          isDragging
            ? "border-amber-700 bg-amber-950/20"
            : "border-stone-700",
        )}
        {...dropHandlers}
        onClick={(event) => {
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
        aria-label="Altar de Consagración — depositá misivas de audio aquí"
      >
        {fileInput}

        {!showGrid ? (
          <div className="pointer-events-none flex flex-1 flex-col items-center justify-center gap-3 py-16">
            {emptyFilterLabel ? (
              <div className="flex h-full min-h-40 w-full items-center justify-center border border-dashed border-stone-800 px-4 py-16">
                <p className="text-center font-serif text-sm uppercase tracking-[0.18em] text-stone-500">
                  {emptyFilterLabel}
                </p>
              </div>
            ) : (
              <>
                <p className="font-serif text-sm tracking-[0.14em] text-amber-500/90 sm:text-base">
                  [ INVOCATIO: DEPOSITA LAS MISIVAS EN EL ALTAR ]
                </p>
                <p className="max-w-md text-center font-mono text-[10px] uppercase tracking-wider text-legion-patina">
                  [ ORACVLO | LINAJE | QVANTA | VECTORES | SENADO (HITL) | COAGVLO ]
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-1 content-start items-start gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {uploads.map((item, index) => (
              <CrisolMicroCard
                key={`${item.file.name}-${item.file.size}-${item.uploadId ?? item.assetId ?? index}`}
                item={item}
              />
            ))}
            {children}
          </div>
        )}

        <button
          type="button"
          className="absolute bottom-3 right-3 border border-amber-700/40 bg-stone-900 px-2 py-1 font-serif text-[10px] uppercase tracking-wider text-amber-500 hover:border-amber-500 hover:text-legion-gold rounded-none"
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
export type { DistillStepperState };
