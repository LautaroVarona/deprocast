import { MagoWorkspace } from "@/components/mago/mago-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mago 7 · Dobles · Ludus · DeProcast",
  description:
    "Las 7 Letras Dobles: Sephirot, chakras y V.I.T.R.I.O.L.",
};

export default function Mago7Page() {
  return <MagoWorkspace lensId="mago-7" />;
}
