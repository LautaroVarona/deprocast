"use client";

import {
  ProposalCard,
  extractCampoSlugsFromProposal,
  type DensityLevel,
  type ProposalEditorState,
} from "@/components/proyectos/proposal-card";
import {
  getDefaultCampo,
  isCampoSlug,
  normalizeCampoSlugs,
  type CampoInfo,
} from "@/lib/projects/campos";
import {
  PROJECT_TIPOS,
  type ProjectProposal,
} from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ProposalsWorkspaceProps = {
  status: "pending" | "archived";
  onPendingCountChange?: (count: number) => void;
  onProposalActivated?: () => void;
};

const DENSITY_STORAGE_KEY = "deprocast-proposals-density-level";

const DENSITY_OPTIONS: { value: DensityLevel; label: string; hint: string }[] = [
  { value: "simple", label: "Simple", hint: "Vibe / rápido" },
  { value: "moderado", label: "Moderado", hint: "Estratégico" },
  { value: "completo", label: "Completo", hint: "Archivista" },
];

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractGravity(payload: Record<string, unknown> | null): {
  prioridad: number;
  impacto: number;
  dificultad: number;
} {
  const gravity = payload?.gravity as Record<string, unknown> | undefined;
  const dimensions = payload?.dimensions as Record<string, unknown> | undefined;

  return {
    prioridad: Number(gravity?.prioridad ?? dimensions?.prioridad ?? 6),
    impacto: Number(gravity?.impacto ?? dimensions?.impacto ?? 6),
    dificultad: Number(gravity?.dificultad ?? dimensions?.dificultad ?? 6),
  };
}

function extractDimensions(payload: Record<string, unknown> | null): {
  materia: string;
  particula: string;
  onda: string;
  espacio: string;
} {
  const dimensions = payload?.dimensions as Record<string, unknown> | undefined;

  return {
    materia: String(dimensions?.materia ?? "texto"),
    particula: String(payload?.particula ?? dimensions?.particula ?? ""),
    onda: String(dimensions?.onda ?? ""),
    espacio: String(dimensions?.espacio ?? "web"),
  };
}

function defaultEditorState(proposal: ProjectProposal): ProposalEditorState {
  const gravity = extractGravity(proposal.sourcePayload);
  const dimensions = extractDimensions(proposal.sourcePayload);

  return {
    mvp: proposal.mvp ?? "",
    firstStep: proposal.firstStep ?? "",
    priorityReason: proposal.priorityReason ?? "",
    tipo: proposal.suggestedTipo ?? "proyecto",
    campoSlugs: extractCampoSlugsFromProposal(proposal),
    persons: [],
    gravity,
    dimensions,
    contextExpanded: false,
    detailsExpanded: false,
  };
}

function readStoredDensity(): DensityLevel {
  if (typeof window === "undefined") return "simple";
  const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
  if (stored === "simple" || stored === "moderado" || stored === "completo") {
    return stored;
  }
  return "simple";
}

function DensityLevelTabs({
  value,
  onChange,
}: {
  value: DensityLevel;
  onChange: (level: DensityLevel) => void;
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-md border border-border bg-muted/20 p-0.5">
      {DENSITY_OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded px-2 py-1 font-mono transition-colors",
              isActive
                ? "bg-primary text-[9px] text-primary-foreground"
                : "text-[9px] text-muted-foreground hover:bg-muted/60",
            )}
            title={option.hint}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ProposalsWorkspace({
  status,
  onPendingCountChange,
  onProposalActivated,
}: ProposalsWorkspaceProps) {
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [campos, setCampos] = useState<CampoInfo[]>([getDefaultCampo()]);
  const [editors, setEditors] = useState<Record<string, ProposalEditorState>>({});
  const [densityLevel, setDensityLevel] = useState<DensityLevel>("simple");
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    setDensityLevel(readStoredDensity());
  }, []);

  const handleDensityChange = (level: DensityLevel) => {
    setDensityLevel(level);
    window.localStorage.setItem(DENSITY_STORAGE_KEY, level);
  };

  const loadProposals = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setIsLoading(true);
      try {
        const [proposalsRes, camposRes] = await Promise.all([
          fetch(`/api/proyectos/proposals?status=${status}`, { cache: "no-store" }),
          fetch("/api/campos", { cache: "no-store" }),
        ]);

        if (proposalsRes.ok) {
          const data: { proposals: ProjectProposal[] } = await proposalsRes.json();
          setProposals(data.proposals);
          setEditors((current) => {
            const next = { ...current };
            for (const proposal of data.proposals) {
              if (!next[proposal.id]) {
                next[proposal.id] = defaultEditorState(proposal);
              }
            }
            return next;
          });
        }

        if (camposRes.ok) {
          const data: { campos?: CampoInfo[] } = await camposRes.json();
          if (data.campos?.length) {
            setCampos(
              data.campos.map((c) => ({
                slug: c.slug,
                label: c.label,
                count: c.count ?? 0,
                description: c.description,
              })),
            );
          }
        }
      } catch {
        if (!options?.silent) setProposals([]);
      } finally {
        if (!options?.silent) setIsLoading(false);
      }
    },
    [status],
  );

  const removeProposalLocally = useCallback((proposalId: string) => {
    setProposals((current) => current.filter((p) => p.id !== proposalId));
    setEditors((current) => {
      const next = { ...current };
      delete next[proposalId];
      return next;
    });
  }, []);

  useEffect(() => {
    if (status === "pending" && onPendingCountChange) {
      onPendingCountChange(proposals.length);
    }
  }, [status, proposals.length, onPendingCountChange]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  const updateEditor = (id: string, patch: Partial<ProposalEditorState>) => {
    setEditors((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  };

  const canActivate = useCallback(
    (id: string) => {
      const editor = editors[id];
      if (!editor) return false;
      if (!PROJECT_TIPOS.includes(editor.tipo)) return false;
      if (
        editor.campoSlugs.length === 0 ||
        !editor.campoSlugs.every((slug) => isCampoSlug(slug))
      ) {
        return false;
      }

      if (densityLevel === "simple") return true;

      return (
        editor.mvp.trim().length > 0 &&
        editor.firstStep.trim().length > 0 &&
        editor.priorityReason.trim().length > 0
      );
    },
    [editors, densityLevel],
  );

  const handleActivate = async (proposal: ProjectProposal) => {
    const editor = editors[proposal.id];
    if (!editor || !canActivate(proposal.id)) return;

    setActingId(proposal.id);
    try {
      const response = await fetch(`/api/proyectos/proposals/${proposal.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mvp: editor.mvp,
          firstStep: editor.firstStep,
          priorityReason: editor.priorityReason,
          tipo: editor.tipo,
          campoSlug: editor.campoSlugs[0],
          campoSlugs: normalizeCampoSlugs(editor.campoSlugs),
          densityLevel,
          personIds: editor.persons.map((person) => person.id),
          gravity: densityLevel === "completo" ? editor.gravity : undefined,
          dimensions: densityLevel === "completo" ? editor.dimensions : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo activar la propuesta.");
      }

      toast.success(`Proyecto activado: ${data.project.title}`);
      removeProposalLocally(proposal.id);
      onProposalActivated?.();
      void loadProposals({ silent: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo activar la propuesta.",
      );
    } finally {
      setActingId(null);
    }
  };

  const handleArchive = async (proposal: ProjectProposal) => {
    setActingId(proposal.id);
    try {
      const response = await fetch(`/api/proyectos/proposals/${proposal.id}/archive`, {
        method: "POST",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo archivar la propuesta.");
      }

      toast.success("Idea archivada en el histórico latente.");
      removeProposalLocally(proposal.id);
      void loadProposals({ silent: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo archivar la propuesta.",
      );
    } finally {
      setActingId(null);
    }
  };

  const emptyMessage = useMemo(() => {
    if (status === "archived") {
      return "No hay ideas archivadas. Las propuestas descartadas aparecerán aquí.";
    }
    return "La bandeja está vacía. Capturá una idea rápida o aprobá contenido en Validar.";
  }, [status]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center font-mono text-[10px] text-muted-foreground">
        <Loader2Icon className="mr-2 size-4 animate-spin" />
        Cargando propuestas…
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
            Incubadora vacía
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
      {status === "pending" && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-md border border-border bg-background/95 px-2 py-1 backdrop-blur">
          <span className="font-mono text-[8px] tracking-[0.15em] text-muted-foreground uppercase">
            Carga
          </span>
          <DensityLevelTabs value={densityLevel} onChange={handleDensityChange} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {proposals.map((proposal) => {
          const editor = editors[proposal.id] ?? defaultEditorState(proposal);
          const isReadOnly = status === "archived";
          const isActing = actingId === proposal.id;

          return (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              editor={editor}
              densityLevel={densityLevel}
              campos={campos}
              isReadOnly={isReadOnly}
              isActing={isActing}
              canActivate={canActivate(proposal.id)}
              onUpdate={(patch) => updateEditor(proposal.id, patch)}
              onCamposChange={setCampos}
              onActivate={() => void handleActivate(proposal)}
              onArchive={() => void handleArchive(proposal)}
              formatTimestamp={formatTimestamp}
            />
          );
        })}
      </div>
    </div>
  );
}
