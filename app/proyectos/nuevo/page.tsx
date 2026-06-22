import { ProjectForm } from "@/components/proyectos/project-form";

export const metadata = {
  title: "Captura rápida · Deprocast",
  description: "Capturá una idea de proyecto en la incubadora del Atanor local.",
};

export default function NuevoProyectoPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-xl items-center px-4 py-4">
      <ProjectForm className="w-full" />
    </div>
  );
}
