import { FutureChannelCard } from "@/components/ingesta/future-channel-card";
import {
  CrownIcon,
  FileTextIcon,
  GaugeIcon,
  ImageIcon,
  Rows3Icon,
  ScanEyeIcon,
  SearchCheckIcon,
  TableIcon,
} from "lucide-react";
import Link from "next/link";

export function FutureChannels() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FutureChannelCard
        icon={TableIcon}
        iconClassName="bg-orange-500/15 text-orange-600 dark:text-orange-400"
        title="Transmutación de Tablas (Excel / CSV)"
        description="Soltá el Control de Retos IA del despacho y cada fila se desglosará automáticamente en un Proyecto/Boss dentro de DeProcast, con su gravedad calculada a partir de Prioridad e Impacto."
        dropHint="Pronto: arrastrá acá tu .xlsx o .csv para transmutarlo"
        flow={[
          { icon: Rows3Icon, label: "Fila de la tabla" },
          { icon: GaugeIcon, label: "Gravedad 1–12" },
          { icon: CrownIcon, label: "Proyecto / Boss" },
        ]}
        footer={
          <span>
            Los proyectos se cargan manualmente en{" "}
            <Link
              href="/proyectos"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              /proyectos
            </Link>
            .
          </span>
        }
      />

      <FutureChannelCard
        icon={ScanEyeIcon}
        iconClassName="bg-violet-500/15 text-violet-600 dark:text-violet-400"
        title="Portal de Visión y Documentos (Imágenes / PDF)"
        description="Fotos de cuadernos, esquemas a mano y lecturas densas. Un OCR intermedio describirá el contenido visual y lo inyectará limpio como contexto indexable, sin ruido estático."
        dropHint="Pronto: arrastrá acá imágenes o PDFs para su lectura ocular"
        flow={[
          { icon: ImageIcon, label: "Imagen / PDF" },
          { icon: FileTextIcon, label: "OCR descriptivo" },
          { icon: SearchCheckIcon, label: "Contexto indexable" },
        ]}
      />
    </div>
  );
}
