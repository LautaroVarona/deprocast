import { CamRecorderWorkspace } from "@/components/cam-recorder/cam-recorder-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cam-Recorder-Watcher · DeProcast",
  description:
    "Agente de ingesta de screen recordings — indexación cronológica de contexto visual para auditoría y Variable X.",
};

export default function CamRecorderPage() {
  return <CamRecorderWorkspace />;
}
