"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CampoSelect } from "@/components/proyectos/campo-select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CAMPO_SLUG,
  type CampoInfo,
  type CampoSlug,
} from "@/lib/projects/campos";
import { InboxIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/proyectos/form-controls";

type ProjectFormProps = {
  className?: string;
};

export function ProjectForm({ className }: ProjectFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [campos, setCampos] = useState<CampoInfo[]>([]);
  const [campoSlug, setCampoSlug] = useState<CampoSlug>(DEFAULT_CAMPO_SLUG);
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
          campoSlug: campoSlug || undefined,
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

        <CampoSelect
          value={campoSlug}
          onChange={setCampoSlug}
          campos={campos.length > 0 ? campos : undefined}
          label="Campo sugerido (opcional)"
        />

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
