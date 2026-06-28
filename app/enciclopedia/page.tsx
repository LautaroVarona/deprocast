import { EnciclopediaWorkspace } from "@/components/enciclopedia/enciclopedia-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enciclopedia · DeProcast",
  description:
    "Enciclopediador — enciclopedia generativa que explora el conocimiento, un concepto a la vez.",
};

export default function EnciclopediaPage() {
  return <EnciclopediaWorkspace />;
}
