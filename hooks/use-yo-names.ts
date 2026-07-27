"use client";

import { useGenesis } from "@/components/yo/genesis-context";
import {
  resolveExocortexDisplayName,
  resolveOperatorDisplayName,
} from "@/lib/yo/display-names";

export type YoDisplayNames = {
  operatorName: string;
  exocortexName: string;
  hasOperatorName: boolean;
  hasExocortexName: boolean;
};

/** Nombres bautizados del Yo para copy de UI (client). */
export function useYoNames(): YoDisplayNames {
  const { yo } = useGenesis();
  const rawOperator = yo?.operatorName?.trim() || "";
  const rawExocortex = yo?.exocortexName?.trim() || "";

  return {
    operatorName: resolveOperatorDisplayName(rawOperator || null),
    exocortexName: resolveExocortexDisplayName(rawExocortex || null),
    hasOperatorName: Boolean(rawOperator),
    hasExocortexName: Boolean(rawExocortex),
  };
}
