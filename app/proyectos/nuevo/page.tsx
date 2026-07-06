import { IncubationWorkspace } from "@/components/proyectos/incubation-workspace";

export const metadata = {
  title: "Incubador conversacional · Deprocast",
  description:
    "Incubá un proyecto conversando con el agente del Atanor. Extracción semántica en vivo con validación humana.",
};

export default function NuevoProyectoPage() {
  return (
    <div className="h-[calc(100dvh-3.5rem)] overflow-hidden">
      <IncubationWorkspace className="h-full" />
    </div>
  );
}
