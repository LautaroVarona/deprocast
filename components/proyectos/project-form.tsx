"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormField,
  inputClassName,
  PercentSlider,
  ScaleSlider,
  textareaClassName,
} from "@/components/proyectos/form-controls";
import {
  DEFAULT_CAMPO_SLUG,
  getDefaultCampo,
  isCampoSlug,
  slugifyCampoInput,
  type CampoInfo,
  type CampoSlug,
} from "@/lib/projects/campos";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import {
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  TagIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const DEFAULT_PRIORIDAD = 6;
const DEFAULT_IMPACTO = 6;
const DEFAULT_DIFICULTAD = 6;
const DEFAULT_ESTADO: ProjectStatus = "Idea";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [responsable, setResponsable] = useState("");
  const [subpersonas, setSubpersonas] = useState<string[]>([""]);
  const [campos, setCampos] = useState<CampoInfo[]>([getDefaultCampo()]);
  const [campoSlug, setCampoSlug] = useState<CampoSlug>(DEFAULT_CAMPO_SLUG);
  const [isCreatingCampo, setIsCreatingCampo] = useState(false);
  const [newCampoName, setNewCampoName] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [metaTags, setMetaTags] = useState<string[]>([]);
  const [fechaInicio, setFechaInicio] = useState(todayIsoDate());
  const [fechaObjetivo, setFechaObjetivo] = useState("");
  const [prioridad, setPrioridad] = useState(DEFAULT_PRIORIDAD);
  const [impacto, setImpacto] = useState(DEFAULT_IMPACTO);
  const [dificultad, setDificultad] = useState(DEFAULT_DIFICULTAD);
  const [horasEstimadas, setHorasEstimadas] = useState(0);
  const [horasRealizadas, setHorasRealizadas] = useState(0);
  const [avancePorcentaje, setAvancePorcentaje] = useState(0);
  const [estado, setEstado] = useState<ProjectStatus>(DEFAULT_ESTADO);
  const [notas, setNotas] = useState("");
  const [resultadoFinal, setResultadoFinal] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const showResultadoFinal = estado === "Implantado" || estado === "Descartado";

  const subpersonasLimpias = useMemo(
    () => subpersonas.map((item) => item.trim()).filter(Boolean),
    [subpersonas],
  );

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/proyectos", { cache: "no-store" });
        if (!response.ok) return;
        const data: { campos?: CampoInfo[] } = await response.json();
        if (data.campos?.length) setCampos(data.campos);
      } catch {
        // Mantener el default local
      }
    })();
  }, []);

  const resolvedCampoSlug = useMemo(() => {
    if (!isCreatingCampo) return campoSlug;
    const slug = slugifyCampoInput(newCampoName);
    return isCampoSlug(slug) ? slug : "";
  }, [isCreatingCampo, campoSlug, newCampoName]);

  const canSubmit =
    title.trim().length > 0 &&
    !isSaving &&
    (!isCreatingCampo || Boolean(resolvedCampoSlug));

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || metaTags.includes(tag)) return;
    setMetaTags((current) => [...current, tag]);
    setTagInput("");
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          responsable,
          subpersonasCargo: subpersonasLimpias,
          campoSlug: resolvedCampoSlug,
          metaTagsSecundarios: metaTags,
          fechaInicio,
          fechaObjetivo,
          prioridad,
          impacto,
          dificultad,
          horasEstimadas,
          horasRealizadas,
          avancePorcentaje,
          estado,
          resultadoFinal: showResultadoFinal ? resultadoFinal : "",
          notasIniciales: notas,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo fijar el proyecto.");
      }

      toast.success(`Proyecto fijado en el Atanor: ${data.project.title}`);
      router.push("/proyectos");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo fijar el proyecto.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="size-5 text-primary" aria-hidden />
          Carga manual de proyecto
        </CardTitle>
        <CardDescription>
          Completá cada dimensión del reto y generá un Markdown soberano en{" "}
          <span className="font-mono text-xs">data/projects/&lt;campo&gt;/&lt;id&gt;.md</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-8">
        <section className="grid gap-5 lg:grid-cols-2">
          <FormField id="project-title" label="Título del Proyecto / Reto">
            <input
              id="project-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Automatizar control de plazos procesales"
              className={inputClassName}
            />
          </FormField>

          <FormField id="project-responsable" label="Responsable">
            <input
              id="project-responsable"
              type="text"
              value={responsable}
              onChange={(event) => setResponsable(event.target.value)}
              placeholder="Persona a cargo"
              className={inputClassName}
            />
          </FormField>

          <div className="lg:col-span-2">
            <FormField id="project-description" label="Descripción del Reto">
              <textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Contexto, objetivo y alcance del proyecto..."
                rows={4}
                className={textareaClassName}
              />
            </FormField>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-medium text-foreground">Subpersonas a cargo</p>
          <div className="space-y-2">
            {subpersonas.map((persona, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={persona}
                  onChange={(event) => {
                    const next = [...subpersonas];
                    next[index] = event.target.value;
                    setSubpersonas(next);
                  }}
                  placeholder={`Persona ${index + 1}`}
                  className={inputClassName}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Eliminar subpersona"
                  disabled={subpersonas.length === 1}
                  onClick={() =>
                    setSubpersonas((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSubpersonas((current) => [...current, ""])}
          >
            <PlusIcon />
            Añadir subpersona
          </Button>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <FormField id="project-campo" label="Campo principal">
              <select
                id="project-campo"
                value={isCreatingCampo ? "__new__" : campoSlug}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "__new__") {
                    setIsCreatingCampo(true);
                    setNewCampoName("");
                    return;
                  }
                  setIsCreatingCampo(false);
                  setCampoSlug(value);
                }}
                className={inputClassName}
              >
                {campos.map((campo) => (
                  <option key={campo.slug} value={campo.slug}>
                    {campo.label}
                  </option>
                ))}
                <option value="__new__">+ Crear nuevo Campo...</option>
              </select>
            </FormField>
            {isCreatingCampo && (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={newCampoName}
                  onChange={(event) => setNewCampoName(event.target.value)}
                  placeholder="Ej: Salud, Creatividad, Aprendizaje..."
                  className={inputClassName}
                />
                {resolvedCampoSlug ? (
                  <p className="text-xs text-muted-foreground">
                    Slug: <span className="font-mono">{resolvedCampoSlug}</span>
                  </p>
                ) : (
                  <p className="text-xs text-destructive">
                    Ingresá un nombre válido para el nuevo Campo.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Tags secundarios</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Añadir tag..."
                className={inputClassName}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                <TagIcon />
              </Button>
            </div>
            {metaTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {metaTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setMetaTags((current) => current.filter((item) => item !== tag))
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs transition-colors hover:bg-muted/70"
                  >
                    {tag}
                    <XIcon className="size-3" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <FormField id="project-fecha-inicio" label="Fecha de inicio">
            <input
              id="project-fecha-inicio"
              type="date"
              value={fechaInicio}
              onChange={(event) => setFechaInicio(event.target.value)}
              className={inputClassName}
            />
          </FormField>

          <FormField id="project-fecha-objetivo" label="Fecha objetivo">
            <input
              id="project-fecha-objetivo"
              type="date"
              value={fechaObjetivo}
              onChange={(event) => setFechaObjetivo(event.target.value)}
              className={inputClassName}
            />
          </FormField>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <ScaleSlider
            id="project-prioridad"
            label="Prioridad"
            value={prioridad}
            onChange={setPrioridad}
          />
          <ScaleSlider
            id="project-impacto"
            label="Impacto"
            value={impacto}
            onChange={setImpacto}
          />
          <ScaleSlider
            id="project-dificultad"
            label="Dificultad"
            value={dificultad}
            onChange={setDificultad}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <FormField id="project-horas-estimadas" label="Horas estimadas">
            <input
              id="project-horas-estimadas"
              type="number"
              min={0}
              step={0.5}
              value={horasEstimadas}
              onChange={(event) => setHorasEstimadas(Number(event.target.value))}
              className={cn(inputClassName, "tabular-nums")}
            />
          </FormField>

          <FormField id="project-horas-realizadas" label="Horas realizadas">
            <input
              id="project-horas-realizadas"
              type="number"
              min={0}
              step={0.5}
              value={horasRealizadas}
              onChange={(event) => setHorasRealizadas(Number(event.target.value))}
              className={cn(inputClassName, "tabular-nums")}
            />
          </FormField>

          <PercentSlider
            id="project-avance"
            label="Avance"
            value={avancePorcentaje}
            onChange={setAvancePorcentaje}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <FormField id="project-estado" label="Estado actual">
            <select
              id="project-estado"
              value={estado}
              onChange={(event) => setEstado(event.target.value as ProjectStatus)}
              className={inputClassName}
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </FormField>
        </section>

        <section className="grid gap-5">
          <FormField
            id="project-notas"
            label="Notas iniciales de progreso"
            hint="(bitácora)"
          >
            <textarea
              id="project-notas"
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
              placeholder="Contexto inicial, primeros pasos o decisiones tomadas..."
              rows={4}
              className={textareaClassName}
            />
          </FormField>

          {showResultadoFinal && (
            <FormField id="project-resultado" label="Resultado final">
              <textarea
                id="project-resultado"
                value={resultadoFinal}
                onChange={(event) => setResultadoFinal(event.target.value)}
                placeholder="Documentá el cierre del proyecto..."
                rows={4}
                className={textareaClassName}
              />
            </FormField>
          )}
        </section>

        <div className="flex flex-wrap gap-3 border-t border-border pt-6">
          <Button
            type="button"
            size="lg"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {isSaving ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SparklesIcon />
            )}
            {isSaving ? "Fijando..." : "Fijar Proyecto en el Atanor"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/proyectos")}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
