import { PersonaDetailWorkspace } from "@/components/personas/persona-detail-workspace";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Persona · ${decodeURIComponent(id)} · Deprocast`,
    description: "Ficha de contexto con proyectos vinculados y muro de actividad.",
  };
}

export default async function PersonaDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PersonaDetailWorkspace idOrSlug={decodeURIComponent(id)} />;
}
