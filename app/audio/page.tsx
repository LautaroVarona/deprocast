import { AudioStationWorkspace } from "@/components/audio-station/audio-station-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Estación de Audio · DeProcast",
  description:
    "Biblioteca de audios, desduplicación, cola STT y mapa de post-procesamiento.",
};

export default function AudioStationPage() {
  return <AudioStationWorkspace />;
}
