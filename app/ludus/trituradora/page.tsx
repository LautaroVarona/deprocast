import { TrituradoraWorkspace } from "@/components/ludus/trituradora/trituradora-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trituradora · Task-Breaker · Ludus · DeProcast",
  description:
    "Arrojá Bosses a la Trituradora: el Task-Breaker los fragmenta en microtareas de 15–40 min para la Trinchera.",
};

export default function TrituradoraPage() {
  return <TrituradoraWorkspace />;
}
