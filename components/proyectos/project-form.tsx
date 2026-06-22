"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  FormField,
  inputClassName,
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
import { InboxIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ProjectFormProps = {
  className?: string;
};

export function ProjectForm({ className }: ProjectFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [campos, setCampos] = useState<CampoInfo[]>([getDefaultCampo()]);
  const [campoSlug, setCampoSlug] = useState<CampoSlug>(DEFAULT_CAMPO_SLUG);
  const [isCreatingCampo, setIsCreatingCampo] = useState(false);
  const [newCampoName, setNewCampoName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const canSubmit = title.trim().length > 0 && !isSaving;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "quick",
          title,
          description,
          campoSlug: resolvedCampoSlug || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar la propuesta.");
      }

      toast.success("Idea capturada en la incubadora.", {
        description: "Completá la validación en Propuestas antes de activar.",
      });
      router.push("/proyectos?view=propuestas");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar la propuesta.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <InboxIcon className="size-5 text-primary" aria-hidden />
          Captura rápida de idea
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <FormField id="project-title" label="Nombre de la idea">
          <input
            id="project-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ej. Automatizar control de plazos procesales"
            className={inputClassName}
          />
        </FormField>

        <FormField
          id="project-description"
          label="Contexto breve (opcional)"
          hint="¿De dónde surgió la idea?"
        >
          <textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Notas sueltas, enlace mental con una charla, etc."
            rows={2}
            className={textareaClassName}
          />
        </FormField>

        <div className="space-y-2">
          <FormField id="project-campo" label="Campo sugerido (opcional)">
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

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {isSaving ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <InboxIcon />
            )}
            {isSaving ? "Guardando..." : "Enviar a incubadora"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/proyectos")}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
