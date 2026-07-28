"use client";

import { cn } from "@/lib/utils";
import type {
  HermeneutaPhase,
  StructuralEdgeProposal,
  StructuralNodeProposal,
} from "@/lib/hermeneuta/types";
import type { NodeType } from "@/lib/kg/types";
import {
  CameraIcon,
  CheckIcon,
  FlameIcon,
  ImageIcon,
  Loader2Icon,
  SwitchCameraIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const LOADING_LABELS = [
  "Calentando Atanor...",
  "Extrayendo Vectores...",
  "Descifrando caligrafía...",
  "Mapeando símbolos...",
] as const;

type HitlNode = StructuralNodeProposal & { enabled: boolean };
type HitlEdge = StructuralEdgeProposal & { enabled: boolean };

const ACCEPTED =
  "image/png,image/jpeg,image/webp,image/gif,image/heic,.png,.jpg,.jpeg,.webp,.gif,.heic";

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const lower = file.name.toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic"].some((ext) =>
    lower.endsWith(ext),
  );
}

async function compressToWebp(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (file.type === "image/webp" && file.size < 1_200_000) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "cuaderno";
    return new File([blob], `${base}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}

export function PanalWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<HermeneutaPhase>("idle");
  const [loadingTick, setLoadingTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [webcamOpen, setWebcamOpen] = useState(false);

  const [semanticText, setSemanticText] = useState("");
  const [nodes, setNodes] = useState<HitlNode[]>([]);
  const [edges, setEdges] = useState<HitlEdge[]>([]);
  const [coagulateResult, setCoagulateResult] = useState<{
    documentPath: string;
    nodeCount: number;
    edgeCount: number;
  } | null>(null);

  const isBusy =
    phase === "calentando" || phase === "extrayendo" || phase === "coagulando";

  useEffect(() => {
    if (!isBusy) return;
    const id = window.setInterval(() => {
      setLoadingTick((t) => (t + 1) % LOADING_LABELS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [isBusy]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [previewUrl]);

  const stopWebcam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setWebcamOpen(false);
  }, []);

  const openWebcam = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setWebcamOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError("No se pudo abrir la cámara. Revisá permisos del navegador.");
      toast.error("Cámara no disponible");
    }
  }, []);

  const runExtract = useCallback(async (file: File) => {
    setError(null);
    setCoagulateResult(null);
    setPhase("calentando");

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setFileName(file.name);

    try {
      const compressed = await compressToWebp(file);
      setPhase("extrayendo");

      const form = new FormData();
      form.append("file", compressed);

      const res = await fetch("/api/hermeneuta", {
        method: "POST",
        body: form,
      });

      const data = (await res.json()) as {
        error?: string;
        semanticText?: string;
        structuralNodes?: StructuralNodeProposal[];
        structuralEdges?: StructuralEdgeProposal[];
        originalFilename?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Fallo del Atanor visual.");
      }

      setSemanticText(data.semanticText ?? "");
      setNodes(
        (data.structuralNodes ?? []).map((n) => ({ ...n, enabled: true })),
      );
      setEdges(
        (data.structuralEdges ?? []).map((e) => ({ ...e, enabled: true })),
      );
      if (data.originalFilename) setFileName(data.originalFilename);
      setPhase("espejo");
      toast.success("Vectores extraídos", {
        description: "Revisá el Espejo antes de coagular.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al extraer vectores.";
      setError(message);
      setPhase("error");
      toast.error(message);
    }
  }, [previewUrl]);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      const image = list.find(isImageFile);
      if (!image) {
        setError("Solo se aceptan imágenes (.png, .jpg, .webp, .gif, .heic).");
        return;
      }
      stopWebcam();
      void runExtract(image);
    },
    [runExtract, stopWebcam],
  );

  const captureWebcam = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      toast.error("Esperá a que la cámara esté lista.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `cuaderno_${Date.now()}.webp`, {
          type: "image/webp",
        });
        stopWebcam();
        void runExtract(file);
      },
      "image/webp",
      0.85,
    );
  }, [runExtract, stopWebcam]);

  const toggleNode = (localId: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.localId === localId ? { ...n, enabled: !n.enabled } : n,
      ),
    );
  };

  const toggleEdge = (localId: string) => {
    setEdges((prev) =>
      prev.map((e) =>
        e.localId === localId ? { ...e, enabled: !e.enabled } : e,
      ),
    );
  };

  const updateNodeName = (localId: string, name: string) => {
    const previous = nodes.find((n) => n.localId === localId);
    const oldName = previous?.name;
    setNodes((prev) =>
      prev.map((n) => (n.localId === localId ? { ...n, name } : n)),
    );
    if (oldName && oldName !== name) {
      setEdges((edgePrev) =>
        edgePrev.map((e) => ({
          ...e,
          fromName: e.fromName === oldName ? name : e.fromName,
          toName: e.toName === oldName ? name : e.toName,
        })),
      );
    }
  };

  const updateNodeType = (localId: string, type: NodeType) => {
    setNodes((prev) =>
      prev.map((n) => (n.localId === localId ? { ...n, type } : n)),
    );
  };

  const handleCoagulate = async () => {
    if (!semanticText.trim()) {
      toast.error("La traducción semántica no puede estar vacía.");
      return;
    }

    const enabledNodes = nodes.filter((n) => n.enabled && n.name.trim());
    const enabledNames = new Set(
      enabledNodes.map((n) => n.name.trim().toLowerCase()),
    );
    const enabledEdges = edges.filter(
      (e) =>
        e.enabled &&
        enabledNames.has(e.fromName.trim().toLowerCase()) &&
        enabledNames.has(e.toName.trim().toLowerCase()),
    );

    setPhase("coagulando");
    setError(null);

    try {
      const res = await fetch("/api/hermeneuta/coagulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semanticText,
          originalFilename: fileName ?? undefined,
          title: fileName?.replace(/\.[^.]+$/, "") || undefined,
          nodes: enabledNodes.map((n) => ({
            name: n.name.trim(),
            type: n.type,
          })),
          edges: enabledEdges.map((e) => ({
            fromName: e.fromName.trim(),
            toName: e.toName.trim(),
            relationType: e.relationType,
            context: e.context,
          })),
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        documentPath?: string;
        nodeIds?: string[];
        edgeIds?: string[];
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Fallo al coagular.");
      }

      setCoagulateResult({
        documentPath: data.documentPath ?? "",
        nodeCount: data.nodeIds?.length ?? 0,
        edgeCount: data.edgeIds?.length ?? 0,
      });
      setPhase("coagulado");
      toast.success("Coagulado en el grafo", {
        description: `${data.nodeIds?.length ?? 0} nodos · ${data.edgeIds?.length ?? 0} aristas · reconocido`,
        action: {
          label: "Abrir Grafo",
          onClick: () => {
            window.location.href = "/grafo";
          },
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo coagular.";
      setError(message);
      setPhase("espejo");
      toast.error(message);
    }
  };

  const resetAll = () => {
    stopWebcam();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName(null);
    setSemanticText("");
    setNodes([]);
    setEdges([]);
    setCoagulateResult(null);
    setError(null);
    setPhase("idle");
  };

  const enabledNodeCount = nodes.filter((n) => n.enabled).length;

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, #FFB000 2px, #FFB000 3px), repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,176,0,0.35) 14px, rgba(255,176,0,0.35) 15px)",
        }}
      />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-3 border-b border-[#FFB000]/25 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#FFB000]/70">
                Enjambre visual · HITL
              </p>
              <h1 className="font-mono text-xl tracking-wide text-[#FFB000] sm:text-2xl">
                Panal de Ingesta Visual
              </h1>
              <p className="max-w-xl font-mono text-xs text-zinc-500">
                Hermeneuta + Mapeador · gnosis analógica → materia prima del
                grafo. Nada entra a SQLite sin coagular.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/grafo"
                className="rounded-sm border border-[#FFB000]/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#FFB000] hover:bg-[#FFB000]/10"
              >
                Grafo
              </Link>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-sm border border-zinc-700 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              >
                Reset
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Captura ── */}
          <section className="space-y-4 rounded-sm border border-[#FFB000]/30 bg-zinc-950/90 p-4 shadow-[0_0_40px_-20px_rgba(255,176,0,0.45)] sm:p-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-[#FFB000]">
              Captura
            </h2>

            {webcamOpen ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-sm border border-[#FFB000]/40 bg-black aspect-[4/3]">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={captureWebcam}
                    disabled={isBusy}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-sm border border-[#FFB000] bg-[#FFB000]/10 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-[#FFB000]",
                      "hover:bg-[#FFB000]/20 disabled:opacity-50",
                    )}
                  >
                    <CameraIcon className="size-3.5" />
                    Disparar
                  </button>
                  <button
                    type="button"
                    onClick={stopWebcam}
                    className="inline-flex items-center gap-2 rounded-sm border border-zinc-700 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400 hover:text-zinc-200"
                  >
                    <XIcon className="size-3.5" />
                    Cerrar cámara
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (!isBusy) handleFiles(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "group flex min-h-[220px] w-full flex-col items-center justify-center gap-4 border border-dashed px-6 py-16 transition-all",
                    isDragging
                      ? "border-[#FFB000] bg-[#FFB000]/10"
                      : "border-[#FFB000]/35 hover:border-[#FFB000]/60 hover:bg-[#FFB000]/5",
                    isBusy && "pointer-events-none opacity-60",
                  )}
                >
                  <UploadCloudIcon
                    className={cn(
                      "size-10 transition-colors",
                      isDragging
                        ? "text-[#FFB000]"
                        : "text-zinc-600 group-hover:text-[#FFB000]/80",
                    )}
                  />
                  <div className="space-y-1 text-center">
                    <p className="font-mono text-sm text-zinc-300">
                      Arrastrá una foto del cuaderno
                    </p>
                    <p className="font-mono text-[10px] text-zinc-600">
                      PNG · JPG · WebP · GIF · HEIC · se comprime a WebP
                    </p>
                  </div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  className="sr-only"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files?.length) handleFiles(files);
                    e.target.value = "";
                  }}
                />

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void openWebcam()}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-sm border border-[#FFB000]/40 px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[#FFB000]",
                    "hover:bg-[#FFB000]/10 disabled:opacity-50",
                  )}
                >
                  <SwitchCameraIcon className="size-3.5" />
                  Abrir WebCam
                </button>
              </>
            )}

            {previewUrl ? (
              <div className="space-y-2 border-t border-zinc-800 pt-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Preview
                </p>
                <div className="relative overflow-hidden rounded-sm border border-zinc-800 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Captura del cuaderno"
                    className="max-h-64 w-full object-contain"
                  />
                </div>
                {fileName ? (
                  <p className="truncate font-mono text-[10px] text-zinc-500">
                    <ImageIcon className="mr-1 inline size-3" />
                    {fileName}
                  </p>
                ) : null}
              </div>
            ) : null}

            {isBusy ? (
              <div className="flex items-center gap-3 rounded-sm border border-[#FFB000]/30 bg-[#FFB000]/5 px-3 py-3">
                <Loader2Icon className="size-4 animate-spin text-[#FFB000]" />
                <div>
                  <p className="font-mono text-xs text-[#FFB000]">
                    {phase === "coagulando"
                      ? "Coagulando en el grafo..."
                      : LOADING_LABELS[loadingTick]}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-600">
                    Soberanía local · egress solo Cohere Vision
                  </p>
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="font-mono text-[11px] text-rose-400/90">{error}</p>
            ) : null}
          </section>

          {/* ── Espejo ── */}
          <section className="space-y-4 rounded-sm border border-[#FFB000]/30 bg-zinc-950/90 p-4 shadow-[0_0_40px_-20px_rgba(255,176,0,0.45)] sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-[#FFB000]">
                El Espejo
              </h2>
              {phase === "espejo" || phase === "coagulado" ? (
                <span className="font-mono text-[10px] text-zinc-500">
                  HITL · {enabledNodeCount}/{nodes.length} nodos
                </span>
              ) : null}
            </div>

            {phase === "idle" || phase === "calentando" || phase === "extrayendo" ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 border border-dashed border-zinc-800 px-4 py-12 text-center">
                <FlameIcon className="size-6 text-[#FFB000]/50" />
                <p className="font-mono text-xs text-zinc-600">
                  {phase === "idle"
                    ? "Esperando materia prima visual…"
                    : "El Atanor trabaja. No se escribe en la base."}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Traducción Semántica
                  </label>
                  <textarea
                    value={semanticText}
                    onChange={(e) => setSemanticText(e.target.value)}
                    disabled={phase === "coagulando" || phase === "coagulado"}
                    rows={10}
                    className="w-full resize-y rounded-sm border border-zinc-800 bg-zinc-900/80 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-[#FFB000]/60 focus:outline-none focus:ring-1 focus:ring-[#FFB000]/40 disabled:opacity-70"
                    placeholder="Texto crudo del Hermeneuta…"
                  />
                </div>

                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Entidades Detectadas
                  </p>
                  {nodes.length === 0 ? (
                    <p className="font-mono text-[11px] text-zinc-600">
                      Sin entidades estructurales en esta captura.
                    </p>
                  ) : (
                    <ul className="max-h-52 space-y-2 overflow-y-auto">
                      {nodes.map((node) => (
                        <li
                          key={node.localId}
                          className={cn(
                            "flex items-start gap-2 rounded-sm border px-2.5 py-2",
                            node.enabled
                              ? "border-[#FFB000]/35 bg-zinc-900/70"
                              : "border-zinc-800 bg-zinc-950 opacity-50",
                          )}
                        >
                          <button
                            type="button"
                            role="switch"
                            aria-checked={node.enabled}
                            onClick={() => toggleNode(node.localId)}
                            disabled={phase === "coagulando" || phase === "coagulado"}
                            className={cn(
                              "mt-1 flex size-5 shrink-0 items-center justify-center rounded-sm border",
                              node.enabled
                                ? "border-[#FFB000] bg-[#FFB000]/20 text-[#FFB000]"
                                : "border-zinc-700 text-transparent",
                            )}
                          >
                            <CheckIcon className="size-3" />
                          </button>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <input
                              value={node.name}
                              onChange={(e) =>
                                updateNodeName(node.localId, e.target.value)
                              }
                              disabled={
                                !node.enabled ||
                                phase === "coagulando" ||
                                phase === "coagulado"
                              }
                              className="w-full border-0 bg-transparent font-mono text-sm text-zinc-100 outline-none focus:ring-0 disabled:opacity-70"
                            />
                            <select
                              value={node.type}
                              onChange={(e) =>
                                updateNodeType(
                                  node.localId,
                                  e.target.value as NodeType,
                                )
                              }
                              disabled={
                                !node.enabled ||
                                phase === "coagulando" ||
                                phase === "coagulado"
                              }
                              className="rounded-sm border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                            >
                              {(
                                [
                                  "persona",
                                  "proyecto",
                                  "concepto",
                                  "idea",
                                  "tecnologia",
                                  "organizacion",
                                  "lugar",
                                  "proceso",
                                  "area",
                                  "recurso",
                                  "ley",
                                ] as NodeType[]
                              ).map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {edges.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                      Aristas sugeridas
                    </p>
                    <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                      {edges.map((edge) => (
                        <li
                          key={edge.localId}
                          className={cn(
                            "flex items-center gap-2 rounded-sm border px-2.5 py-1.5 font-mono text-[11px]",
                            edge.enabled
                              ? "border-[#FFB000]/25 text-zinc-300"
                              : "border-zinc-800 text-zinc-600 opacity-50",
                          )}
                        >
                          <button
                            type="button"
                            role="switch"
                            aria-checked={edge.enabled}
                            onClick={() => toggleEdge(edge.localId)}
                            disabled={
                              phase === "coagulando" || phase === "coagulado"
                            }
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                              edge.enabled
                                ? "border-[#FFB000] bg-[#FFB000]/20 text-[#FFB000]"
                                : "border-zinc-700",
                            )}
                          >
                            <CheckIcon className="size-2.5" />
                          </button>
                          <span className="truncate">
                            {edge.fromName}{" "}
                            <span className="text-[#FFB000]/80">
                              → {edge.relationType} →
                            </span>{" "}
                            {edge.toName}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {phase === "coagulado" && coagulateResult ? (
                  <div className="rounded-sm border border-emerald-500/30 bg-emerald-500/5 px-3 py-3 font-mono text-[11px] text-emerald-300/90">
                    Coagulado · {coagulateResult.nodeCount} nodos ·{" "}
                    {coagulateResult.edgeCount} aristas · reconocido:true
                    {coagulateResult.documentPath ? (
                      <p className="mt-1 truncate text-zinc-500">
                        {coagulateResult.documentPath}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy || !semanticText.trim()}
                    onClick={() => void handleCoagulate()}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-sm border px-4 py-3.5 font-mono text-xs uppercase tracking-[0.18em] transition-all",
                      "border-[#FFB000] bg-[#FFB000]/10 text-[#FFB000]",
                      "hover:bg-[#FFB000]/20 hover:shadow-[0_0_30px_-8px_rgba(255,176,0,0.7)]",
                      "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none",
                    )}
                  >
                    {phase === "coagulando" ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <FlameIcon className="size-4" />
                    )}
                    Coagular en el grafo
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
