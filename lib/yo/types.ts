import { z } from "zod";

export const OPERATOR_PROFILE_ID = "operator";

export const OPERATIONAL_STATUSES = [
  "OPERATIVO",
  "EN_FOCO",
  "REPOSO",
  "CALIBRANDO",
] as const;

export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];

export const CALIBRATION_PROMPTS = [
  {
    id: "metrica_exito_hoy",
    question: "¿Cuál es tu métrica de éxito hoy?",
  },
  {
    id: "foco_principal",
    question: "¿Cuál es tu foco principal ahora mismo?",
  },
  {
    id: "energia_bloqueante",
    question: "¿Qué está drenando tu energía operativa?",
  },
  {
    id: "senal_vital",
    question: "¿Qué señal vital necesitás que el sistema recuerde?",
  },
  {
    id: "compromiso_inquebrantable",
    question: "¿Qué compromiso es innegociable esta semana?",
  },
] as const;

export type CalibrationMap = Record<string, string>;

export type OperatorProfileDto = {
  id: string;
  displayName: string;
  operationalStatus: string;
  energyLevel: number;
  calibration: CalibrationMap;
  updatedAt: string;
};

export const patchOperatorProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  operationalStatus: z.enum(OPERATIONAL_STATUSES).optional(),
  energyLevel: z.number().int().min(1).max(12).optional(),
  calibrationEntry: z
    .object({
      promptId: z.string().trim().min(1).max(80),
      answer: z.string().trim().min(1).max(500),
    })
    .optional(),
});

export type PatchOperatorProfileInput = z.infer<
  typeof patchOperatorProfileSchema
>;
