import { ProjectForm } from "@/components/proyectos/project-form";
import Link from "next/link";

export const metadata = {
  title: "Nuevo Proyecto · Deprocast",
  description: "Carga manual de un proyecto en el Atanor local.",
};

export default function NuevoProyectoPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <Link
          href="/proyectos"
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Volver al tablero
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Fijar nuevo proyecto</h1>
        <p className="text-sm text-muted-foreground">
          Completá el grimorio del reto y generá su archivo Markdown soberano en el Campo
          elegido.
        </p>
      </header>

      <ProjectForm />
    </div>
  );
}
