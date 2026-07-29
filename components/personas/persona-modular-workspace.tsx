"use client";

import { createPersonaAction } from "@/app/personas/actions";
import { useBabel } from "@/components/babel/babel-context";
import { AliasTagInput } from "@/components/personas/alias-tag-input";
import { ConnectionEntityPicker } from "@/components/personas/connection-entity-picker";
import { cachePersonaEntity } from "@/lib/personas/client-cache";
import { readClientYoSnapshot } from "@/lib/yo/client-snapshot";
import { Button } from "@/components/ui/button";
import {
  WorkspaceModal,
  WorkspaceModalHeader,
} from "@/components/ui/workspace-modal";
import {
  linesToList,
  listToLines,
  type CanalPreferido,
  type EstadoRegistro,
  type EstadoRelacion,
  type FrecuenciaInteraccion,
  type ImpactoVibe,
  type NaturalezaVinculo,
  type PersonaCrmModules,
  type PersonaTipo,
  type PresupuestoNivel,
  type RolProyecto,
} from "@/lib/personas/crm-modules";
import type {
  Persona,
  PersonaConnectionDraft,
  PersonaLinkTarget,
  PersonaRelationListItem,
} from "@/lib/personas/model";
import { cn } from "@/lib/utils";
import { useYoNames } from "@/hooks/use-yo-names";
import {
  BriefcaseIcon,
  HandshakeIcon,
  Loader2Icon,
  NetworkIcon,
  RadarIcon,
  UserRoundIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ModuleId =
  | "identidad"
  | "contacto"
  | "proyectos"
  | "red"
  | "oportunidades"
  | "telemetria";

type DraftConnection = PersonaConnectionDraft & {
  localId: string;
  edgeId?: string;
};

type PersonaModularWorkspaceProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPersona?: Persona;
  /** Relaciones existentes (edit) para hidratar M3/M4. */
  initialRelations?: PersonaRelationListItem[];
  onCreated?: (persona: Persona) => void;
  onSaved?: (persona: Persona) => void;
};

const MODULES: {
  id: ModuleId;
  label: string;
  short: string;
  icon: typeof UserRoundIcon;
}[] = [
  { id: "identidad", label: "Identidad & Filiación", short: "Identidad", icon: UserRoundIcon },
  { id: "contacto", label: "Contacto & Capital", short: "Contacto", icon: WalletIcon },
  { id: "proyectos", label: "Proyectos & Operatividad", short: "Proyectos", icon: BriefcaseIcon },
  { id: "red", label: "Red & Conexiones", short: "Red", icon: NetworkIcon },
  { id: "oportunidades", label: "Intercambio & Oportunidades", short: "Oportunidades", icon: HandshakeIcon },
  { id: "telemetria", label: "Telemetría & Biocontexto", short: "Contexto", icon: RadarIcon },
];

const INPUT =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const LABEL =
  "font-mono text-[10px] tracking-wider text-muted-foreground uppercase";
const SELECT = cn(INPUT, "appearance-none");

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className={LABEL}>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function emptyForm(universeSlug: string | null) {
  return {
    nombre: "",
    aliases: [] as string[],
    documento: "",
    fechaNacimiento: "",
    nacionalidad: "",
    tipoPersona: "" as "" | PersonaTipo,
    vinculoOperador: "",
    telefono: "",
    email: "",
    sitioWeb: "",
    linkedin: "",
    x: "",
    instagram: "",
    aparicionesPublicas: "",
    presupuesto: "" as "" | PresupuestoNivel,
    rolProyecto: "" as "" | RolProyecto,
    hardSkills: "",
    softSkills: "",
    frecuencia: "" as "" | FrecuenciaInteraccion,
    capital: "",
    empresas: "",
    naturalezaVinculo: "" as "" | NaturalezaVinculo,
    canalPreferido: "" as "" | CanalPreferido,
    avales: "",
    historialAsaltos: "",
    busca: "",
    ofrece: "",
    oportunidadActiva: "",
    estadoRelacion: "" as "" | EstadoRelacion,
    proximaAccion: "",
    historialIntercambios: "",
    origenIngesta: "",
    universoBabel: universeSlug ?? "",
    etiquetas: "",
    notasTranscripciones: "",
    impactoVibe: "" as "" | ImpactoVibe,
    estadoRegistro: "verificado" as "" | EstadoRegistro,
  };
}

type FormState = ReturnType<typeof emptyForm>;

function hydrateFromPersona(
  persona: Persona,
  universeSlug: string | null,
): FormState {
  const crm = persona.crm ?? {};
  const base = emptyForm(universeSlug);
  return {
    ...base,
    nombre: persona.nombrePrincipal,
    aliases: persona.aliases ?? [],
    documento: crm.identity?.documento ?? "",
    fechaNacimiento: crm.identity?.fechaNacimiento ?? "",
    nacionalidad: crm.identity?.nacionalidad ?? "",
    tipoPersona: crm.identity?.tipoPersona ?? "",
    vinculoOperador: crm.identity?.vinculoOperador ?? "",
    telefono: crm.contacto?.telefono ?? "",
    email: crm.contacto?.email ?? "",
    sitioWeb: crm.contacto?.sitioWeb ?? "",
    linkedin: crm.contacto?.linkedin ?? "",
    x: crm.contacto?.x ?? "",
    instagram: crm.contacto?.instagram ?? "",
    aparicionesPublicas: crm.contacto?.aparicionesPublicas ?? "",
    presupuesto: crm.contacto?.presupuesto ?? "",
    rolProyecto: crm.proyectos?.rolProyecto ?? "",
    hardSkills: listToLines(crm.proyectos?.hardSkills),
    softSkills: listToLines(crm.proyectos?.softSkills),
    frecuencia: crm.proyectos?.frecuencia ?? "",
    capital:
      typeof crm.proyectos?.capital === "number"
        ? String(crm.proyectos.capital)
        : "",
    empresas: crm.red?.empresas ?? "",
    naturalezaVinculo: crm.red?.naturalezaVinculo ?? "",
    canalPreferido: crm.red?.canalPreferido ?? "",
    avales: crm.red?.avales ?? "",
    historialAsaltos: crm.red?.historialAsaltos ?? "",
    busca: crm.oportunidades?.busca ?? "",
    ofrece: crm.oportunidades?.ofrece ?? "",
    oportunidadActiva: crm.oportunidades?.oportunidadActiva ?? "",
    estadoRelacion: crm.oportunidades?.estadoRelacion ?? "",
    proximaAccion: crm.oportunidades?.proximaAccion ?? "",
    historialIntercambios: crm.oportunidades?.historialIntercambios ?? "",
    origenIngesta: crm.telemetria?.origenIngesta ?? "",
    universoBabel: crm.telemetria?.universoBabel || universeSlug || "",
    etiquetas: listToLines(crm.telemetria?.etiquetas),
    notasTranscripciones:
      crm.telemetria?.notasTranscripciones || persona.notasGenerales || "",
    impactoVibe: crm.telemetria?.impactoVibe ?? "",
    estadoRegistro: crm.telemetria?.estadoRegistro ?? "verificado",
  };
}

function buildCrm(form: FormState): PersonaCrmModules {
  const capitalNum = Number.parseInt(form.capital, 10);
  return {
    identity: {
      documento: form.documento || undefined,
      fechaNacimiento: form.fechaNacimiento || undefined,
      nacionalidad: form.nacionalidad || undefined,
      tipoPersona: form.tipoPersona || undefined,
      vinculoOperador: form.vinculoOperador || undefined,
    },
    contacto: {
      telefono: form.telefono || undefined,
      email: form.email || undefined,
      sitioWeb: form.sitioWeb || undefined,
      linkedin: form.linkedin || undefined,
      x: form.x || undefined,
      instagram: form.instagram || undefined,
      aparicionesPublicas: form.aparicionesPublicas || undefined,
      presupuesto: form.presupuesto || undefined,
    },
    proyectos: {
      rolProyecto: form.rolProyecto || undefined,
      hardSkills: linesToList(form.hardSkills),
      softSkills: linesToList(form.softSkills),
      frecuencia: form.frecuencia || undefined,
      capital:
        Number.isFinite(capitalNum) && capitalNum >= 1 && capitalNum <= 12
          ? capitalNum
          : undefined,
    },
    red: {
      empresas: form.empresas || undefined,
      naturalezaVinculo: form.naturalezaVinculo || undefined,
      canalPreferido: form.canalPreferido || undefined,
      avales: form.avales || undefined,
      historialAsaltos: form.historialAsaltos || undefined,
    },
    oportunidades: {
      busca: form.busca || undefined,
      ofrece: form.ofrece || undefined,
      oportunidadActiva: form.oportunidadActiva || undefined,
      estadoRelacion: form.estadoRelacion || undefined,
      proximaAccion: form.proximaAccion || undefined,
      historialIntercambios: form.historialIntercambios || undefined,
    },
    telemetria: {
      origenIngesta: form.origenIngesta || undefined,
      universoBabel: form.universoBabel || undefined,
      etiquetas: linesToList(form.etiquetas),
      notasTranscripciones: form.notasTranscripciones || undefined,
      impactoVibe: form.impactoVibe || undefined,
      estadoRegistro: form.estadoRegistro || undefined,
    },
  };
}

function relationsToDrafts(
  relations: PersonaRelationListItem[] | undefined,
): { projects: DraftConnection[]; people: DraftConnection[] } {
  const projects: DraftConnection[] = [];
  const people: DraftConnection[] = [];
  if (!relations?.length) return { projects, people };

  for (const rel of relations) {
    if (rel.kind === "proyecto") {
      projects.push({
        localId: crypto.randomUUID(),
        edgeId: rel.id,
        targetId: rel.targetId,
        targetKind: "proyecto",
        targetLabel: rel.label,
        relationContext: rel.contexto || rel.rolPrincipal || "Proyecto asignado",
        relationType: rel.rolPrincipal || rel.relationType || undefined,
      });
    } else if (rel.kind === "persona") {
      people.push({
        localId: crypto.randomUUID(),
        edgeId: rel.id,
        targetId: rel.targetId,
        targetKind: "persona",
        targetLabel: rel.label,
        relationContext: rel.contexto || "Vinculada",
        relationType: rel.relationType || undefined,
      });
    }
  }
  return { projects, people };
}

async function syncRelations(params: {
  personaId: string;
  personaNombre: string;
  projects: DraftConnection[];
  people: DraftConnection[];
  initialRelations: PersonaRelationListItem[];
  rolProyecto: string;
  naturaleza: string;
  fetchFn: typeof fetch;
}) {
  const {
    personaId,
    personaNombre,
    projects,
    people,
    initialRelations,
    rolProyecto,
    naturaleza,
    fetchFn,
  } = params;

  const initialProjectIds = new Set(
    initialRelations
      .filter((r) => r.kind === "proyecto")
      .map((r) => r.targetId),
  );
  const initialPeopleIds = new Set(
    initialRelations.filter((r) => r.kind === "persona").map((r) => r.targetId),
  );

  const nextProjectIds = new Set(projects.map((p) => p.targetId));
  const nextPeopleIds = new Set(people.map((p) => p.targetId));

  for (const rel of initialRelations) {
    if (rel.kind === "proyecto" && !nextProjectIds.has(rel.targetId)) {
      await fetchFn(`/api/personas/relations/${encodeURIComponent(rel.id)}`, {
        method: "DELETE",
      });
    }
    if (rel.kind === "persona" && !nextPeopleIds.has(rel.targetId)) {
      await fetchFn(`/api/personas/relations/${encodeURIComponent(rel.id)}`, {
        method: "DELETE",
      });
    }
  }

  for (const project of projects) {
    if (initialProjectIds.has(project.targetId)) continue;
    const response = await fetchFn("/api/personas/relations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "persona-proyecto",
        personaId,
        proyectoId: project.targetId,
        rolPrincipal: rolProyecto || project.relationType || "colaborador",
        contexto: project.relationContext || "Proyecto asignado",
        personaNombre,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        (data as { error?: string }).error ??
          `No se pudo vincular el proyecto ${project.targetLabel}.`,
      );
    }
  }

  for (const person of people) {
    if (initialPeopleIds.has(person.targetId)) continue;
    const response = await fetchFn("/api/personas/relations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origenId: personaId,
        destinoId: person.targetId,
        tipoRelacion: naturaleza || person.relationType || "relacionado_con",
        contexto: person.relationContext || "Vinculada",
        origenNombre: personaNombre,
        destinoNombre: person.targetLabel,
        personaNombre,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        (data as { error?: string }).error ??
          `No se pudo vincular a ${person.targetLabel}.`,
      );
    }
  }
}

export function PersonaModularWorkspace({
  mode,
  open,
  onOpenChange,
  initialPersona,
  initialRelations,
  onCreated,
  onSaved,
}: PersonaModularWorkspaceProps) {
  const { universeSlug, universeFetch } = useBabel();
  const { operatorName } = useYoNames();
  const [moduleId, setModuleId] = useState<ModuleId>("identidad");
  const [form, setForm] = useState<FormState>(() => emptyForm(universeSlug));
  const [projectLinks, setProjectLinks] = useState<DraftConnection[]>([]);
  const [peopleLinks, setPeopleLinks] = useState<DraftConnection[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setModuleId("identidad");
    setIsSaving(false);
    if (mode === "edit" && initialPersona) {
      setForm(hydrateFromPersona(initialPersona, universeSlug));
      const drafts = relationsToDrafts(initialRelations);
      setProjectLinks(drafts.projects);
      setPeopleLinks(drafts.people);
    } else {
      setForm(emptyForm(universeSlug));
      setProjectLinks([]);
      setPeopleLinks([]);
    }
  }, [open, mode, initialPersona, initialRelations, universeSlug]);

  const set =
    <K extends keyof FormState>(key: K) =>
    (
      value:
        | FormState[K]
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
      const next =
        typeof value === "object" && value !== null && "target" in value
          ? (value.target.value as FormState[K])
          : value;
      setForm((prev) => ({ ...prev, [key]: next }));
    };

  const excludeProjectIds = useMemo(
    () => projectLinks.map((c) => c.targetId),
    [projectLinks],
  );
  const excludePeopleIds = useMemo(
    () => [
      ...peopleLinks.map((c) => c.targetId),
      ...(initialPersona ? [initialPersona.id] : []),
    ],
    [peopleLinks, initialPersona],
  );

  const addProject = (target: PersonaLinkTarget) => {
    if (target.kind !== "proyecto") return;
    if (projectLinks.some((c) => c.targetId === target.id)) return;
    setProjectLinks((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        targetId: target.id,
        targetKind: "proyecto",
        targetLabel: target.label,
        relationContext: "Proyecto asignado",
        relationType: form.rolProyecto || "colaborador",
      },
    ]);
  };

  const addPerson = (target: PersonaLinkTarget) => {
    if (target.kind !== "persona") return;
    if (peopleLinks.some((c) => c.targetId === target.id)) return;
    setPeopleLinks((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        targetId: target.id,
        targetKind: "persona",
        targetLabel: target.label,
        relationContext: "Vinculada",
        relationType: form.naturalezaVinculo || "relacionado_con",
      },
    ]);
  };

  const handleSubmit = async () => {
    const trimmedName = form.nombre.trim();
    if (!trimmedName) {
      toast.error("El nombre completo es obligatorio.");
      setModuleId("identidad");
      return;
    }

    const incomplete = [...projectLinks, ...peopleLinks].find(
      (c) => !c.relationContext.trim(),
    );
    if (incomplete) {
      toast.error(
        `Indicá el contexto del vínculo con ${incomplete.targetLabel}.`,
      );
      return;
    }

    const crm = buildCrm(form);
    const notasGenerales = form.notasTranscripciones.trim();
    setIsSaving(true);

    try {
      if (mode === "create") {
        const connections: PersonaConnectionDraft[] = [
          ...projectLinks,
          ...peopleLinks,
        ].map(({ localId: _l, edgeId: _e, ...rest }) => rest);

        const result = await createPersonaAction({
          nombrePrincipal: trimmedName,
          aliases: form.aliases,
          notasGenerales,
          relationToOperator: form.vinculoOperador.trim() || undefined,
          universeSlug: universeSlug ?? undefined,
          connections,
          crm,
          clientIdentity: readClientYoSnapshot() ?? undefined,
        });

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success(`${result.data.nombrePrincipal} indexada.`);
        cachePersonaEntity(result.data);
        onCreated?.(result.data);
        onOpenChange(false);
        return;
      }

      if (!initialPersona) return;

      const response = await universeFetch(
        `/api/personas/${encodeURIComponent(initialPersona.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombrePrincipal: trimmedName,
            aliases: form.aliases,
            notasGenerales,
            crm,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar la persona.");
      }

      await syncRelations({
        personaId: initialPersona.id,
        personaNombre: trimmedName,
        projects: projectLinks,
        people: peopleLinks,
        initialRelations: initialRelations ?? [],
        rolProyecto: form.rolProyecto,
        naturaleza: form.naturalezaVinculo,
        fetchFn: universeFetch,
      });

      toast.success("Persona actualizada.");
      onSaved?.(data.persona as Persona);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al guardar la persona.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <WorkspaceModal open={open} onOpenChange={onOpenChange}>
      <WorkspaceModalHeader
        title={mode === "create" ? "Nueva persona" : "Editar persona"}
        description="Matriz 6×6 · solo el nombre es obligatorio"
        onClose={() => onOpenChange(false)}
      >
        <input
          value={form.nombre}
          onChange={set("nombre")}
          placeholder="Nombre completo *"
          className={cn(INPUT, "max-w-xl font-medium")}
          required
          autoFocus={mode === "create"}
        />
      </WorkspaceModalHeader>

      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-52 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border p-2 sm:flex">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            const active = moduleId === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setModuleId(mod.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                  active
                    ? "bg-emerald-500/15 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="font-medium">{mod.short}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 sm:hidden">
            {MODULES.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => setModuleId(mod.id)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1.5 font-mono text-[10px] tracking-wider uppercase",
                  moduleId === mod.id
                    ? "bg-emerald-500/15 text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {mod.short}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <h3 className="mb-4 font-mono text-xs font-semibold tracking-wider uppercase">
              {MODULES.find((m) => m.id === moduleId)?.label}
            </h3>

            {moduleId === "identidad" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Aliases / Apodos" className="sm:col-span-2">
                  <AliasTagInput
                    aliases={form.aliases}
                    onChange={(aliases) =>
                      setForm((prev) => ({ ...prev, aliases }))
                    }
                  />
                </Field>
                <Field label="DNI / Documento / Pasaporte">
                  <input
                    value={form.documento}
                    onChange={set("documento")}
                    className={INPUT}
                  />
                </Field>
                <Field label="Fecha de nacimiento / Edad">
                  <input
                    value={form.fechaNacimiento}
                    onChange={set("fechaNacimiento")}
                    placeholder="YYYY-MM-DD o edad"
                    className={INPUT}
                  />
                </Field>
                <Field label="Nacionalidad / Origen / Residencia">
                  <input
                    value={form.nacionalidad}
                    onChange={set("nacionalidad")}
                    className={INPUT}
                  />
                </Field>
                <Field label="Tipo de persona">
                  <select
                    value={form.tipoPersona}
                    onChange={set("tipoPersona")}
                    className={SELECT}
                  >
                    <option value="">—</option>
                    <option value="fisica">Física</option>
                    <option value="juridica">Jurídica</option>
                  </select>
                </Field>
                <Field
                  label={`Vínculo con ${operatorName}`}
                  className="sm:col-span-2"
                >
                  <input
                    value={form.vinculoOperador}
                    onChange={set("vinculoOperador")}
                    placeholder={`Ej. Socio, Cliente, Mentor de ${operatorName}…`}
                    className={INPUT}
                  />
                </Field>
              </div>
            )}

            {moduleId === "contacto" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Teléfono / WhatsApp">
                  <input
                    value={form.telefono}
                    onChange={set("telefono")}
                    className={INPUT}
                  />
                </Field>
                <Field label="Email principal">
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    className={INPUT}
                  />
                </Field>
                <Field label="Sitio web / Portfolio" className="sm:col-span-2">
                  <input
                    value={form.sitioWeb}
                    onChange={set("sitioWeb")}
                    className={INPUT}
                  />
                </Field>
                <Field label="LinkedIn">
                  <input
                    value={form.linkedin}
                    onChange={set("linkedin")}
                    className={INPUT}
                  />
                </Field>
                <Field label="X">
                  <input value={form.x} onChange={set("x")} className={INPUT} />
                </Field>
                <Field label="Instagram">
                  <input
                    value={form.instagram}
                    onChange={set("instagram")}
                    className={INPUT}
                  />
                </Field>
                <Field label="Presupuesto / Capital">
                  <select
                    value={form.presupuesto}
                    onChange={set("presupuesto")}
                    className={SELECT}
                  >
                    <option value="">—</option>
                    <option value="bajo">Bajo</option>
                    <option value="medio">Medio</option>
                    <option value="alto">Alto</option>
                    <option value="inversor">Inversor</option>
                  </select>
                </Field>
                <Field
                  label="Apariciones públicas / Prensa"
                  className="sm:col-span-2"
                >
                  <textarea
                    value={form.aparicionesPublicas}
                    onChange={set("aparicionesPublicas")}
                    rows={3}
                    placeholder="Links a notas, charlas…"
                    className={cn(INPUT, "resize-y")}
                  />
                </Field>
              </div>
            )}

            {moduleId === "proyectos" && (
              <div className="space-y-4">
                <Field label="Proyectos asignados (Atanor)">
                  <ConnectionEntityPicker
                    kinds={["proyecto"]}
                    excludeIds={excludeProjectIds}
                    onSelect={addProject}
                  />
                </Field>
                {projectLinks.length > 0 && (
                  <ul className="space-y-2">
                    {projectLinks.map((link) => (
                      <li
                        key={link.localId}
                        className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-2.5"
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="truncate text-sm font-medium">
                            {link.targetLabel}
                          </p>
                          <input
                            value={link.relationContext}
                            onChange={(event) =>
                              setProjectLinks((prev) =>
                                prev.map((row) =>
                                  row.localId === link.localId
                                    ? {
                                        ...row,
                                        relationContext: event.target.value,
                                      }
                                    : row,
                                ),
                              )
                            }
                            placeholder="Contexto del vínculo"
                            className={cn(INPUT, "py-1.5")}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setProjectLinks((prev) =>
                              prev.filter((row) => row.localId !== link.localId),
                            )
                          }
                        >
                          <XIcon />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Rol en proyecto">
                    <select
                      value={form.rolProyecto}
                      onChange={set("rolProyecto")}
                      className={SELECT}
                    >
                      <option value="">—</option>
                      <option value="responsable">Responsable</option>
                      <option value="colaborador">Colaborador</option>
                      <option value="cliente">Cliente</option>
                      <option value="asesor">Asesor</option>
                      <option value="otro">Otro</option>
                    </select>
                  </Field>
                  <Field label="Frecuencia de interacción">
                    <select
                      value={form.frecuencia}
                      onChange={set("frecuencia")}
                      className={SELECT}
                    >
                      <option value="">—</option>
                      <option value="diaria">Diaria</option>
                      <option value="semanal">Semanal</option>
                      <option value="mensual">Mensual</option>
                      <option value="latente">Latente</option>
                    </select>
                  </Field>
                  <Field label="Hard skills">
                    <textarea
                      value={form.hardSkills}
                      onChange={set("hardSkills")}
                      rows={3}
                      placeholder="Una por línea o separadas por coma"
                      className={cn(INPUT, "resize-y")}
                    />
                  </Field>
                  <Field label="Soft skills">
                    <textarea
                      value={form.softSkills}
                      onChange={set("softSkills")}
                      rows={3}
                      placeholder="Una por línea o separadas por coma"
                      className={cn(INPUT, "resize-y")}
                    />
                  </Field>
                  <Field label="Capital (escala 1–12)">
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={form.capital}
                      onChange={set("capital")}
                      className={INPUT}
                    />
                  </Field>
                </div>
              </div>
            )}

            {moduleId === "red" && (
              <div className="space-y-4">
                <Field label="Personas vinculadas">
                  <ConnectionEntityPicker
                    kinds={["persona"]}
                    excludeIds={excludePeopleIds}
                    onSelect={addPerson}
                  />
                </Field>
                {peopleLinks.length > 0 && (
                  <ul className="space-y-2">
                    {peopleLinks.map((link) => (
                      <li
                        key={link.localId}
                        className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-2.5"
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="truncate text-sm font-medium">
                            {link.targetLabel}
                          </p>
                          <input
                            value={link.relationContext}
                            onChange={(event) =>
                              setPeopleLinks((prev) =>
                                prev.map((row) =>
                                  row.localId === link.localId
                                    ? {
                                        ...row,
                                        relationContext: event.target.value,
                                      }
                                    : row,
                                ),
                              )
                            }
                            placeholder="Contexto del vínculo"
                            className={cn(INPUT, "py-1.5")}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setPeopleLinks((prev) =>
                              prev.filter((row) => row.localId !== link.localId),
                            )
                          }
                        >
                          <XIcon />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Empresas / Entidades" className="sm:col-span-2">
                    <textarea
                      value={form.empresas}
                      onChange={set("empresas")}
                      rows={2}
                      className={cn(INPUT, "resize-y")}
                    />
                  </Field>
                  <Field label="Naturaleza del vínculo">
                    <select
                      value={form.naturalezaVinculo}
                      onChange={set("naturalezaVinculo")}
                      className={SELECT}
                    >
                      <option value="">—</option>
                      <option value="laboral">Laboral</option>
                      <option value="personal">Personal</option>
                      <option value="estrategico">Estratégico</option>
                      <option value="academico">Académico</option>
                    </select>
                  </Field>
                  <Field label="Canal preferido">
                    <select
                      value={form.canalPreferido}
                      onChange={set("canalPreferido")}
                      className={SELECT}
                    >
                      <option value="">—</option>
                      <option value="presencial">Presencial</option>
                      <option value="audio">Audio</option>
                      <option value="texto">Texto</option>
                    </select>
                  </Field>
                  <Field label="Avales / Referencias" className="sm:col-span-2">
                    <textarea
                      value={form.avales}
                      onChange={set("avales")}
                      rows={2}
                      placeholder="¿Quién lo trajo a la red?"
                      className={cn(INPUT, "resize-y")}
                    />
                  </Field>
                  <Field
                    label="Historial de asaltos / Interacciones"
                    className="sm:col-span-2"
                  >
                    <textarea
                      value={form.historialAsaltos}
                      onChange={set("historialAsaltos")}
                      rows={3}
                      className={cn(INPUT, "resize-y")}
                    />
                  </Field>
                </div>
              </div>
            )}

            {moduleId === "oportunidades" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Lo que busca / Necesidades">
                  <textarea
                    value={form.busca}
                    onChange={set("busca")}
                    rows={3}
                    className={cn(INPUT, "resize-y")}
                  />
                </Field>
                <Field label="Lo que ofrece / Valor tangible">
                  <textarea
                    value={form.ofrece}
                    onChange={set("ofrece")}
                    rows={3}
                    className={cn(INPUT, "resize-y")}
                  />
                </Field>
                <Field label="Oportunidad activa" className="sm:col-span-2">
                  <input
                    value={form.oportunidadActiva}
                    onChange={set("oportunidadActiva")}
                    placeholder="Deal, colaboración, venta, contratación…"
                    className={INPUT}
                  />
                </Field>
                <Field label="Estado de la relación">
                  <select
                    value={form.estadoRelacion}
                    onChange={set("estadoRelacion")}
                    className={SELECT}
                  >
                    <option value="">—</option>
                    <option value="prospecto">Prospecto</option>
                    <option value="aliado">Aliado</option>
                    <option value="cliente">Cliente</option>
                    <option value="mentorizado">Mentorizado</option>
                  </select>
                </Field>
                <Field label="Próxima acción (Next Step)">
                  <input
                    value={form.proximaAccion}
                    onChange={set("proximaAccion")}
                    placeholder="Llamar el viernes, enviar PDF…"
                    className={INPUT}
                  />
                </Field>
                <Field
                  label="Historial de intercambios"
                  className="sm:col-span-2"
                >
                  <textarea
                    value={form.historialIntercambios}
                    onChange={set("historialIntercambios")}
                    rows={3}
                    className={cn(INPUT, "resize-y")}
                  />
                </Field>
              </div>
            )}

            {moduleId === "telemetria" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Origen de ingesta">
                  <input
                    value={form.origenIngesta}
                    onChange={set("origenIngesta")}
                    placeholder="Terminal, Caminata, Reunión…"
                    className={INPUT}
                  />
                </Field>
                <Field label="Universo Babel">
                  <input
                    value={form.universoBabel}
                    onChange={set("universoBabel")}
                    placeholder={universeSlug ?? "root"}
                    className={INPUT}
                  />
                </Field>
                <Field label="Etiquetas semánticas" className="sm:col-span-2">
                  <textarea
                    value={form.etiquetas}
                    onChange={set("etiquetas")}
                    rows={2}
                    placeholder="#PGHQG, #Inversor…"
                    className={cn(INPUT, "resize-y")}
                  />
                </Field>
                <Field
                  label="Notas / Transcripciones vinculadas"
                  className="sm:col-span-2"
                >
                  <textarea
                    value={form.notasTranscripciones}
                    onChange={set("notasTranscripciones")}
                    rows={4}
                    className={cn(INPUT, "resize-y")}
                  />
                </Field>
                <Field label="Impacto en vibe">
                  <select
                    value={form.impactoVibe}
                    onChange={set("impactoVibe")}
                    className={SELECT}
                  >
                    <option value="">—</option>
                    <option value="sube">Sube</option>
                    <option value="neutro">Neutro</option>
                    <option value="baja">Baja</option>
                  </select>
                </Field>
                <Field label="Estado del registro">
                  <select
                    value={form.estadoRegistro}
                    onChange={set("estadoRegistro")}
                    className={SELECT}
                  >
                    <option value="verificado">Verificado</option>
                    <option value="candidato">Candidato</option>
                  </select>
                </Field>
              </div>
            )}
          </div>

          <div className="flex shrink-0 gap-2 border-t border-border px-4 py-3 sm:px-5">
            <Button
              type="button"
              className="flex-1 sm:flex-none sm:min-w-40"
              disabled={isSaving || !form.nombre.trim()}
              onClick={() => void handleSubmit()}
            >
              {isSaving && <Loader2Icon className="animate-spin" />}
              {mode === "create" ? "Crear persona" : "Guardar cambios"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </WorkspaceModal>
  );
}
