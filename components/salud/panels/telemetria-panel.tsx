import {
  TELEMETRIA_PLACEHOLDER,
} from "@/components/salud/constants";
import { ConstructionPlaceholder } from "@/components/salud/shared/construction-placeholder";

export function TelemetriaPanel() {
  return (
    <ConstructionPlaceholder subtitle={TELEMETRIA_PLACEHOLDER.subtitle} />
  );
}
