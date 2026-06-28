import { LudusWorldPage } from "@/components/ludus/ludus-world-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ludus · DeProcast",
  description:
    "Modo videojuego — explora Castillo, Campamento y Trinchera sobre el corpus validado.",
};

export default function LudusPage() {
  return <LudusWorldPage />;
}
