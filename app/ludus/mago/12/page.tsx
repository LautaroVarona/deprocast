import { MagoWorkspace } from "@/components/mago/mago-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mago 12 · Simples · Ludus · DeProcast",
  description:
    "Las 12 Letras Simples: astrología, fisiología y la Gran Obra alquímica.",
};

export default function Mago12Page() {
  return <MagoWorkspace lensId="mago-12" />;
}
