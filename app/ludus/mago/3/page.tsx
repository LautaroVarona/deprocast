import { MagoWorkspace } from "@/components/mago/mago-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mago 3 · Madres · Ludus · DeProcast",
  description:
    "Las 3 Letras Madres: Mercurio, Azufre y Sal — principios elementales y alquímicos.",
};

export default function Mago3Page() {
  return <MagoWorkspace lensId="mago-3" />;
}
