"use client";



import { useBabel } from "@/components/babel/babel-context";

import { PurificationAuditStepper } from "@/components/validar/purification-audit-stepper";

import { ProjectLinkCombobox } from "@/components/validar/project-link-combobox";

import { StrictMetaTagsEditor } from "@/components/validar/strict-meta-tags-editor";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import type { CampoInfo } from "@/lib/projects/campos";

import type { Project } from "@/lib/projects/types";

import {

  formatIngestTimestamp,

  MATERIA_OPTIONS,

  normalizeMateria,

  normalizeOnda,

  normalizeOrigen,

  normalizePosicion,

  ONDA_OPTIONS,

  ORIGEN_OPTIONS,

  POSICION_OPTIONS,

  resolveIngestTimestamp,

  toIsoDate,

} from "@/lib/purifier/hitl-metadata";

import type { PurifierReviewRecord } from "@/lib/purifier/types";
import { resolveReviewMetaTags } from "@/lib/purifier/meta-tags";
import {
  PIPELINE_STATUS_LABELS,
  type PipelineStatus,
} from "@/lib/purifier/pipeline-status";

import { cn } from "@/lib/utils";

import {

  CheckCircle2Icon,

  Loader2Icon,

  ShieldCheckIcon,

  XCircleIcon,

} from "lucide-react";

import { useRouter, useSearchParams } from "next/navigation";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";



function extractBodyFromMarkdown(markdown: string): string {

  const match = markdown.match(/##\s+Transcripción purificada\s*\n+([\s\S]*?)$/i);

  if (match?.[1]) return match[1].trim();



  const afterFrontmatter = markdown.replace(/^---\n[\s\S]*?\n---\n*/, "");

  const afterTitle = afterFrontmatter.replace(/^#\s+.+\n+/, "");

  return afterTitle.trim();

}



function FieldLabel({ children }: { children: React.ReactNode }) {

  return (

    <label className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">

      {children}

    </label>

  );

}



function SelectField({

  label,

  value,

  onChange,

  options,

}: {

  label: string;

  value: string;

  onChange: (value: string) => void;

  options: ReadonlyArray<{ value: string; label: string }>;

}) {

  return (

    <div className="space-y-0.5">

      <FieldLabel>{label}</FieldLabel>

      <select

        value={value}

        onChange={(event) => onChange(event.target.value)}

        className="h-7 w-full rounded border border-input bg-background px-2 font-mono text-[10px] outline-none focus:border-ring focus:ring-1 focus:ring-ring"

      >

        {options.map((option) => (

          <option key={option.value} value={option.value}>

            {option.label}

          </option>

        ))}

      </select>

    </div>

  );

}



function TextField({

  label,

  value,

  onChange,

}: {

  label: string;

  value: string;

  onChange: (value: string) => void;

}) {

  return (

    <div className="space-y-0.5">

      <FieldLabel>{label}</FieldLabel>

      <input

        type="text"

        value={value}

        onChange={(event) => onChange(event.target.value)}

        className="h-7 w-full rounded border border-input bg-background px-2 font-mono text-[10px] outline-none focus:border-ring focus:ring-1 focus:ring-ring"

      />

    </div>

  );

}



function ReadOnlyField({

  label,

  value,

}: {

  label: string;

  value: string;

}) {

  return (

    <div className="space-y-0.5">

      <FieldLabel>{label}</FieldLabel>

      <p className="rounded border border-border/60 bg-muted/20 px-2 py-1.5 font-mono text-[10px] text-foreground/90">

        {value}

      </p>

    </div>

  );

}



export function ValidarWorkspace() {

  const router = useRouter();

  const searchParams = useSearchParams();

  const { universeSlug, universeFetch, isLoading: isUniverseLoading } = useBabel();

  const selectedId = searchParams.get("id");



  const [records, setRecords] = useState<

    Array<{ reviewId: string; title: string; processedAt: string }>

  >([]);

  const [record, setRecord] = useState<PurifierReviewRecord | null>(null);

  const [campos, setCampos] = useState<CampoInfo[]>([]);

  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);

  const [approving, setApproving] = useState(false);

  const [rejecting, setRejecting] = useState(false);



  const [title, setTitle] = useState("");

  const [campoSlug, setCampoSlug] = useState("babel");

  const [body, setBody] = useState("");

  const [metaTags, setMetaTags] = useState<string[]>([]);

  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);

  const [ingestTimestamp, setIngestTimestamp] = useState("");

  const [dimensions, setDimensions] = useState({

    materia: "texto",

    posicion: "",

    onda: "",

    origen: "web",

    field: "",

  });



  const loadQueue = useCallback(async () => {

    try {

      const response = await universeFetch("/api/purifier/review", { cache: "no-store" });

      if (!response.ok) return;

      const data = await response.json();

      setRecords(data.records ?? []);

    } catch {

      // no crítico

    }

  }, [universeFetch]);



  const loadRecord = useCallback(async (reviewId: string) => {

    setLoading(true);

    try {

      const response = await universeFetch(`/api/purifier/review/${reviewId}`, {
        cache: "no-store",
      });

      if (!response.ok) {

        setRecord(null);

        return;

      }



      const data = await response.json();

      const r = data.record as PurifierReviewRecord;

      setRecord(r);



      const channel = r.source.metadata.channel;

      const d = r.suggestedDimensions;

      const timestamp = resolveIngestTimestamp(r);



      setTitle(d.title);

      setCampoSlug(r.gravity.campoSlug ?? "babel");

      setBody(extractBodyFromMarkdown(r.normalizedMarkdown));

      setMetaTags(resolveReviewMetaTags(r));

      setLinkedProjectIds([]);

      setIngestTimestamp(timestamp);

      setDimensions({

        materia: normalizeMateria(d.materia, channel),

        posicion: normalizePosicion(d.posicion),

        onda: normalizeOnda(d.onda),

        origen: normalizeOrigen(d.espacio, channel),

        field: d.field,

      });

    } catch {

      setRecord(null);

    } finally {

      setLoading(false);

    }

  }, [universeFetch]);



  useEffect(() => {
    setRecords([]);
    setRecord(null);
  }, [universeSlug]);

  useEffect(() => {
    if (isUniverseLoading) return;

    void loadQueue();

    void (async () => {
      const response = await universeFetch("/api/proyectos", { cache: "no-store" });

      if (response.ok) {
        const data = await response.json();

        setCampos(data.campos ?? []);
        setProjects(data.projects ?? []);
      }
    })();
  }, [loadQueue, universeFetch, universeSlug, isUniverseLoading]);



  useEffect(() => {

    if (selectedId) {

      void loadRecord(selectedId);

    } else if (records.length > 0) {

      router.replace(`/validar?id=${records[0].reviewId}`);

    } else {

      setLoading(false);

    }

  }, [selectedId, records, loadRecord, router]);

  // Poll mientras la materia está en purificación / refresco de cola Aduana.
  useEffect(() => {
    if (isUniverseLoading) return;

    const status = record?.pipelineStatus;
    const purifying =
      status === "pendiente_purificacion" || status === "prima_materia";

    if (!purifying && !selectedId) {
      const queueTimer = window.setInterval(() => {
        void loadQueue();
      }, 8000);
      return () => window.clearInterval(queueTimer);
    }

    if (!purifying || !selectedId) return;

    const timer = window.setInterval(() => {
      void loadRecord(selectedId);
      void loadQueue();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [
    record?.pipelineStatus,
    selectedId,
    loadRecord,
    loadQueue,
    isUniverseLoading,
  ]);



  const dudaCount = record?.doubts.length ?? 0;



  const handleApprove = async () => {

    if (!record) return;

    setApproving(true);



    try {

      const response = await universeFetch("/api/purifier/approve", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          reviewId: record.reviewId,

          campoSlug,

          title,

          markdownBody: body,

          metaTagsSecundarios: metaTags,

          linkedProjectIds,

          dimensions: {

            materia: dimensions.materia,

            particula: record.particula,

            posicion: dimensions.posicion,

            onda: dimensions.onda,

            tiempo: toIsoDate(ingestTimestamp),

            espacio: dimensions.origen,

            field: dimensions.field || campoSlug,

            prioridad: record.gravity.prioridad,

            impacto: record.gravity.impacto,

            dificultad: record.gravity.dificultad,

          },

        }),

      });



      const data = await response.json();

      if (!response.ok) {

        throw new Error(data.error ?? "No se pudo aprobar el documento");

      }



      toast.success("Enviado a incubadora de proyectos.", {
        description: data.proposalId
          ? `${data.title} · Revisá en Proyectos → Propuestas`
          : undefined,
        action: data.proposalId
          ? {
              label: "Ver propuestas",
              onClick: () => router.push("/proyectos?view=propuestas"),
            }
          : undefined,
      });



      await loadQueue();

      const remaining = records.filter((r) => r.reviewId !== record.reviewId);

      if (remaining.length > 0) {

        router.replace(`/validar?id=${remaining[0].reviewId}`);

      } else {

        setRecord(null);

        router.replace("/validar");

      }

    } catch (error) {

      toast.error(

        error instanceof Error ? error.message : "Error al aprobar",

      );

    } finally {

      setApproving(false);

    }

  };



  const handleReject = async () => {

    if (!record) return;

    const confirmed = window.confirm(

      "¿Rechazar esta validación? Se eliminará de la cola y no se coagulará conocimiento.",

    );

    if (!confirmed) return;

    setRejecting(true);

    toast.info("Rechazando validación…", {

      description: "Esta validación está siendo rechazada y será eliminada.",

    });



    try {

      const response = await universeFetch("/api/purifier/reject", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ reviewId: record.reviewId }),

      });



      const data = await response.json();

      if (!response.ok) {

        throw new Error(data.error ?? "No se pudo rechazar la validación");

      }



      toast.success("Validación rechazada.", {

        description: "El registro fue eliminado de la cola de revisión.",

      });



      await loadQueue();

      const remaining = records.filter((r) => r.reviewId !== record.reviewId);

      if (remaining.length > 0) {

        router.replace(`/validar?id=${remaining[0].reviewId}`);

      } else {

        setRecord(null);

        router.replace("/validar");

      }

    } catch (error) {

      toast.error(

        error instanceof Error ? error.message : "Error al rechazar",

      );

    } finally {

      setRejecting(false);

    }

  };



  return (

    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">

      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">

        <div className="flex items-center gap-2">

          <ShieldCheckIcon className="size-4 text-primary" />

          <div>

            <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">

              Aduana Humana · HITL

            </p>

            <h1 className="text-sm font-semibold">Validar y Enviar a Incubadora</h1>

          </div>

        </div>



        {records.length > 0 && (

          <select

            value={selectedId ?? ""}

            onChange={(e) => router.push(`/validar?id=${e.target.value}`)}

            className="h-7 max-w-xs rounded border border-input bg-background px-2 font-mono text-[10px] outline-none"

          >

            {records.map((r) => (

              <option key={r.reviewId} value={r.reviewId}>

                {r.title}

              </option>

            ))}

          </select>

        )}

      </header>



      {loading ? (

        <div className="flex flex-1 items-center justify-center">

          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />

        </div>

      ) : !record ? (

        <div className="flex flex-1 items-center justify-center p-6 text-center">

          <p className="font-mono text-xs text-muted-foreground">

            Cola de revisión vacía. Ingestá prima materia desde cualquier canal

            (texto, audio, tablas o visión) y aparecerá acá tras la purificación.

          </p>

        </div>

      ) : record.pipelineStatus === "pendiente_purificacion" ||
        record.pipelineStatus === "prima_materia" ? (

        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-mono text-xs text-foreground">
              {PIPELINE_STATUS_LABELS[record.pipelineStatus as PipelineStatus]}
            </p>
            <p className="max-w-sm font-mono text-[11px] text-muted-foreground">
              La captura ya está en el pipeline. Cuando pase a pendiente de
              validación se abrirá el editor de la Aduana.
            </p>
            {record.purificationError ? (
              <p className="font-mono text-[11px] text-destructive">
                {record.purificationError}
              </p>
            ) : null}
          </div>
        </div>

      ) : (

        <>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(220px,26%)_minmax(0,1fr)_minmax(260px,30%)] overflow-hidden">

            <aside className="flex min-h-0 flex-col border-r border-border">

              <div className="shrink-0 border-b border-border px-3 py-2">

                <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">

                  Materia Prima Cruda

                </p>

                <p className="truncate font-mono text-[10px] text-foreground/80">

                  {record.source.filename}

                </p>

              </div>

              <pre className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-muted-foreground">

                {record.originalText}

              </pre>

            </aside>



            <section className="flex min-h-0 min-w-0 flex-col border-r border-border">

              <PurificationAuditStepper
                snapshots={record.stages}
                originalText={record.originalText}
                defaultExpanded={false}
              />

              <div className="shrink-0 border-b border-border px-4 py-2">

                <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">

                  Cuerpo Purificado

                </p>

                <p className="text-[10px] text-muted-foreground">

                  Revisá y editá lo que la IA estructuró. Las líneas con{" "}

                  <span className="rounded bg-accent/80 px-1 font-mono text-accent">

                    ==DUDA:==

                  </span>{" "}

                  requieren atención humana.

                </p>

              </div>

              <div className="relative min-h-0 flex-1 p-3">

                <textarea

                  value={body}

                  onChange={(event) => setBody(event.target.value)}

                  spellCheck={false}

                  className={cn(

                    "h-full min-h-[280px] w-full resize-none rounded border border-input bg-background p-3 font-mono text-[11px] leading-relaxed outline-none focus:border-ring focus:ring-1 focus:ring-ring",

                    dudaCount > 0 && "focus:ring-accent/40",

                  )}

                />

              </div>

            </section>



            <aside className="flex min-h-0 flex-col overflow-hidden">

              <div className="shrink-0 border-b border-border px-3 py-2">

                <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">

                  Metadatos y Relaciones

                </p>

              </div>



              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">

                <TextField label="Título" value={title} onChange={setTitle} />



                <div className="space-y-0.5">

                  <FieldLabel>Campo destino</FieldLabel>

                  <select

                    value={campoSlug}

                    onChange={(event) => setCampoSlug(event.target.value)}

                    className="h-7 w-full rounded border border-input bg-background px-2 font-mono text-[10px] outline-none"

                  >

                    {campos.map((campo) => (

                      <option key={campo.slug} value={campo.slug}>

                        {campo.label}

                      </option>

                    ))}

                  </select>

                </div>



                <SelectField

                  label="Materia"

                  value={dimensions.materia}

                  onChange={(value) =>

                    setDimensions((current) => ({ ...current, materia: value }))

                  }

                  options={MATERIA_OPTIONS}

                />



                <ReadOnlyField

                  label="Tiempo"

                  value={formatIngestTimestamp(ingestTimestamp)}

                />



                <SelectField

                  label="Origen"

                  value={dimensions.origen}

                  onChange={(value) =>

                    setDimensions((current) => ({ ...current, origen: value }))

                  }

                  options={ORIGEN_OPTIONS}

                />



                <Accordion className="rounded border border-border">
                  <AccordionItem value="vectores-gravedad">
                    <AccordionTrigger className="px-2 py-1.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase hover:no-underline">
                      Vectores de Gravedad
                    </AccordionTrigger>
                    <AccordionContent className="px-2">
                      <div className="grid grid-cols-1 gap-2">
                        <SelectField
                          label="Onda · Energía"
                          value={dimensions.onda}
                          onChange={(value) =>
                            setDimensions((current) => ({ ...current, onda: value }))
                          }
                          options={ONDA_OPTIONS}
                        />
                        <p className="font-mono text-[9px] text-muted-foreground">
                          Estado de energía requerido (ej. Foco Profundo, Trámite Rápido).
                        </p>
                        <SelectField
                          label="Posición · Rol / Sombrero"
                          value={dimensions.posicion}
                          onChange={(value) =>
                            setDimensions((current) => ({
                              ...current,
                              posicion: value,
                            }))
                          }
                          options={POSICION_OPTIONS}
                        />
                        <p className="font-mono text-[9px] text-muted-foreground">
                          Rol activo del Observador al trabajar esta materia.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>



                <div className="space-y-1.5 rounded border border-border bg-muted/20 p-2">

                  <FieldLabel>Conexiones</FieldLabel>

                  <ProjectLinkCombobox

                    projects={projects}

                    selectedIds={linkedProjectIds}

                    onChange={setLinkedProjectIds}

                  />

                </div>



                <div className="space-y-1">

                  <FieldLabel>Meta tags · 6 estrictos</FieldLabel>

                  <StrictMetaTagsEditor tags={metaTags} onChange={setMetaTags} />

                </div>

              </div>

            </aside>

          </div>



          <footer className="flex shrink-0 items-center justify-between border-t border-border bg-card px-4 py-2">

            <p className="font-mono text-[10px] text-muted-foreground">

              {dudaCount > 0

                ? `${dudaCount} zona${dudaCount === 1 ? "" : "s"} de duda · revisar marcadores ==DUDA:== en el cuerpo`

                : "Sin zonas de duda detectadas"}

            </p>

            <div className="flex items-center gap-2">

              <Button

                type="button"

                size="default"

                variant="destructive"

                disabled={rejecting || approving}

                onClick={() => void handleReject()}

                className="gap-2 font-medium"

              >

                {rejecting ? (

                  <>

                    <Loader2Icon className="size-4 animate-spin" />

                    Rechazando…

                  </>

                ) : (

                  <>

                    <XCircleIcon className="size-4" />

                    Rechazado

                  </>

                )}

              </Button>



              <Button

                type="button"

                size="default"

                disabled={approving || rejecting || !title.trim() || !body.trim()}

                onClick={() => void handleApprove()}

                className="gap-2 font-medium"

              >

                {approving ? (

                  <>

                    <Loader2Icon className="size-4 animate-spin" />

                    Enviando…

                  </>

                ) : (

                  <>

                    <CheckCircle2Icon className="size-4" />

                    Aprobar y enviar a incubadora

                  </>

                )}

              </Button>

            </div>

          </footer>

        </>

      )}

    </div>

  );

}

