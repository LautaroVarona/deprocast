import { BabelProvider } from "@/components/babel/babel-context";
import { CortexDashboard } from "@/components/cortex/cortex-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "El Córtex · DeProcast",
  description:
    "Centro de control: snapshot de corpus, sesgo semántico y tarjetas de conocimiento.",
};

export default function CortexPage() {
  return (
    <BabelProvider>
      <CortexDashboard />
    </BabelProvider>
  );
}
