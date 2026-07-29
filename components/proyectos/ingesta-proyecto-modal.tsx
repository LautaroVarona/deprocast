"use client";

import { useBabel } from "@/components/babel/babel-context";
import {
  IngestaCaptureForm,
  type IngestaCaptureValues,
} from "@/components/proyectos/ingesta-capture-form";
import { IngestaWarRoom } from "@/components/proyectos/ingesta-war-room";
import type { SelectedPerson } from "@/components/proyectos/person-badge-select";
import {
  WorkspaceModal,
  WorkspaceModalHeader,
} from "@/components/ui/workspace-modal";
import { Button } from "@/components/ui/button";
import { notifyDomainRefresh } from "@/lib/domain-refresh";
import {
  DEFAULT_CAMPO_SLUG,
  getDefaultCampo,
  type CampoInfo,
} from "@/lib/projects/campos";
import { matrixSeedToCoagulatePayload } from "@/lib/projects/ideate/coagulate";
import {
  ideateResponseSchema,
  type IdeateResponse,
  type MatrixSeed,
} from "@/lib/projects/ideate/schema";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Step = "capture" | "distilling" | "war_room";

type IngestaProyectoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCoagulated?: () => void;
};

const EMPTY_CAPTURE: IngestaCaptureValues = {
  title: "",
  brainDump: "",
  amazonAResourceIds: [],
  mentions: [],
};

export function IngestaProyectoModal({
  open,
  onOpenChange,
  onCoagulated,
}: IngestaProyectoModalProps) {
  const { universeSlug, universeFetch } = useBabel();
  const [step, setStep] = useState<Step>("capture");
  const [capture, setCapture] = useState<IngestaCaptureValues>(EMPTY_CAPTURE);
  const [seed, setSeed] = useState<MatrixSeed | null>(null);
  const [people, setPeople] = useState<SelectedPerson[]>([]);
  const [campos, setCampos] = useState<CampoInfo[]>([getDefaultCampo()]);
  const [amazonANames, setAmazonANames] = useState<Record<string, string>>({});
  const [isBusy, setIsBusy] = useState(false);

  const reset = useCallback(() => {
    setStep("capture");
    setCapture(EMPTY_CAPTURE);
    setSeed(null);
    setPeople([]);
    setAmazonANames({});
    setIsBusy(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    void (async () => {
      try {
        const response = await universeFetch("/api/proyectos", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data: { campos?: CampoInfo[] } = await response.json();
        setCampos(data.campos?.length ? data.campos : [getDefaultCampo()]);
      } catch {
        setCampos([getDefaultCampo()]);
      }
    })();
  }, [open, reset, universeFetch]);

  const handleClose = (next: boolean) => {
    if (!next && isBusy) return;
    onOpenChange(next);
  };

  const hydrateFromIdeate = (response: IdeateResponse) => {
    setSeed(response.matrix_seed);
    setAmazonANames(
      Object.fromEntries(response.amazonA.map((r) => [r.id, r.name])),
    );

    const resolvedPeople: SelectedPerson[] = response.resolved_mentions
      .filter((m) => m.prefix === "@" && m.matched && m.kgNodeId)
      .map((m) => ({ id: m.kgNodeId as string, label: m.label }));

    const unique = new Map(resolvedPeople.map((p) => [p.id, p]));
    setPeople([...unique.values()]);
    setStep("war_room");
  };

  const handleProcess = async () => {
    if (!capture.title.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }

    setIsBusy(true);
    setStep("distilling");
    try {
      const response = await fetch("/api/proyectos/ideate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: capture.title.trim(),
          brainDump: capture.brainDump,
          amazonAResourceIds: capture.amazonAResourceIds,
          mentions: capture.mentions,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo destilar el proyecto.");
      }
      const parsed = ideateResponseSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error("Respuesta de ideate inválida.");
      }
      hydrateFromIdeate(parsed.data);
    } catch (error) {
      setStep("capture");
      toast.error(
        error instanceof Error ? error.message : "Error al procesar en el Atanor.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const assignAmazonA = async (projectId: string, resourceIds: string[]) => {
    await Promise.all(
      resourceIds.map(async (id) => {
        const response = await fetch(`/api/amazona/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            data.error ?? `No se pudo vincular AmazonA ${id}.`,
          );
        }
      }),
    );
  };

  const handleSaveEmpty = async () => {
    if (!capture.title.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }
    setIsBusy(true);
    try {
      const response = await universeFetch("/api/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: capture.title.trim(),
          campoSlug: campos[0]?.slug ?? DEFAULT_CAMPO_SLUG,
          description: "",
          metaTagsSecundarios: [],
          responsable: "",
          subpersonasCargo: [],
          fechaInicio: "",
          fechaObjetivo: "",
          prioridad: 6,
          impacto: 6,
          dificultad: 6,
          horasEstimadas: 0,
          horasRealizadas: 0,
          avancePorcentaje: 0,
          estado: "Idea",
          resultadoFinal: "",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear el proyecto vacío.");
      }

      if (capture.amazonAResourceIds.length > 0 && data.project?.id) {
        await assignAmazonA(data.project.id, capture.amazonAResourceIds);
      }

      notifyDomainRefresh("all", "project-coagulated");
      toast.success("Proyecto vacío coagulado.");
      if (data.project) {
        const { cacheProjectEntity } = await import("@/lib/personas/client-cache");
        cacheProjectEntity(data.project);
      }
      onCoagulated?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al guardar vacío.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleCoagulate = async () => {
    if (!seed) return;
    if (!seed.identidad.title.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }

    setIsBusy(true);
    try {
      const nextSeed: MatrixSeed = {
        ...seed,
        arquitectura: {
          ...seed.arquitectura,
          personNodeIds: people.map((p) => p.id),
        },
      };
      const payload = matrixSeedToCoagulatePayload(nextSeed);
      const response = await universeFetch("/api/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          tipo: payload.tipo,
          campoSlug: payload.campoSlug,
          metaTagsSecundarios: payload.metaTagsSecundarios,
          description: payload.description,
          personIds: payload.personIds,
          responsable: payload.responsable,
          subpersonasCargo: payload.subpersonasCargo,
          fechaInicio: payload.fechaInicio,
          fechaObjetivo: payload.fechaObjetivo,
          prioridad: payload.prioridad,
          impacto: payload.impacto,
          dificultad: payload.dificultad,
          horasEstimadas: payload.horasEstimadas,
          horasRealizadas: payload.horasRealizadas,
          avancePorcentaje: payload.avancePorcentaje,
          estado: payload.estado,
          resultadoFinal: payload.resultadoFinal,
          notasIniciales: payload.notasIniciales,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo coagular el proyecto.");
      }

      if (payload.amazonAResourceIds.length > 0 && data.project?.id) {
        await assignAmazonA(data.project.id, payload.amazonAResourceIds);
      }

      notifyDomainRefresh("all", "project-coagulated");
      toast.success("Proyecto coagulado en el Atanor.");
      onCoagulated?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al coagular.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const headerMeta = useMemo(() => {
    if (step === "distilling") {
      return {
        title: "Destilación",
        description: "Analizando contexto semántico en el Atanor…",
      };
    }
    if (step === "war_room") {
      return {
        title: "War Room · Borrador HITL",
        description: "Auditá la Matriz 6×6 antes de coagular.",
      };
    }
    return {
      title: "Lienzo de Ingesta",
      description: "Semilla del proyecto — captura rápida.",
    };
  }, [step]);

  return (
    <WorkspaceModal
      open={open}
      onOpenChange={handleClose}
      className={cn(
        step === "war_room"
          ? "h-[min(920px,94dvh)] w-[min(1180px,98vw)]"
          : "h-[min(720px,90dvh)] w-[min(640px,96vw)]",
      )}
    >
      <WorkspaceModalHeader
        title={headerMeta.title}
        description={headerMeta.description}
        onClose={() => handleClose(false)}
      >
        {step === "capture" && (
          <Link
            href="/proyectos/nuevo"
            className="font-mono text-[10px] text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => onOpenChange(false)}
          >
            Incubador conversacional →
          </Link>
        )}
      </WorkspaceModalHeader>

      {step === "distilling" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
          <ul className="space-y-1 font-mono text-[11px] text-muted-foreground">
            <li>Analizando contexto semántico…</li>
            <li>Calculando fricción operativa…</li>
            <li>Desglosando árbol MoSCoW…</li>
            <li>Consultando el Grafo…</li>
          </ul>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBusy}
            onClick={() => {
              setIsBusy(false);
              setStep("capture");
            }}
          >
            Cancelar
          </Button>
        </div>
      )}

      {step === "capture" && (
        <IngestaCaptureForm
          values={capture}
          onChange={setCapture}
          onProcess={() => void handleProcess()}
          onSaveEmpty={() => void handleSaveEmpty()}
          isBusy={isBusy}
          universeSlug={universeSlug}
        />
      )}

      {step === "war_room" && seed && (
        <IngestaWarRoom
          seed={seed}
          onChange={setSeed}
          people={people}
          onPeopleChange={setPeople}
          campos={campos}
          amazonANames={amazonANames}
          onCoagulate={() => void handleCoagulate()}
          onBack={() => setStep("capture")}
          isBusy={isBusy}
        />
      )}
    </WorkspaceModal>
  );
}
