import { ArchivoWorkspace } from "@/components/archivo/archivo-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Archivo · DeProcast",
  description:
    "Repositorio unificado de materia prima: textos, transcripciones, cuadernos, diarios y documentos crudos.",
};

export default function ArchivoPage() {
  return <ArchivoWorkspace />;
}
