import { z } from "zod";

export const YO_CORE_ID = "core";

export const DEFAULT_EXOCORTEX_NAME = "Mastropiero";

export const OPERATIONAL_STATUSES = [
  "STANDBY",
  "OPERATIVO",
  "EN_FOCO",
  "REPOSO",
  "CALIBRANDO",
] as const;

export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];

export const EXOCORTEX_NAMED_BY = ["operator", "autonomous"] as const;
export type ExocortexNamedBy = (typeof EXOCORTEX_NAMED_BY)[number];

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

export type YoDto = {
  id: string;
  operatorName: string | null;
  exocortexName: string | null;
  exocortexNamedBy: ExocortexNamedBy | null;
  operationalStatus: string;
  energyLevel: number;
  calibration: CalibrationMap;
  genesisCompleted: boolean;
  genesisCompletedAt: string | null;
  updatedAt: string;
};

export type YoConduitMessageDto = {
  id: string;
  role: "operator" | "exocortex" | "system";
  content: string;
  createdAt: string;
};

/** Filtro romano del bautismo: sólo letras, máx. 13. */
export const ROMAN_NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+$/;
export const ROMAN_NAME_MAX = 13;

const romanNameSchema = z
  .string()
  .trim()
  .min(1, "El nombre no puede estar vacío.")
  .max(ROMAN_NAME_MAX, `Máximo ${ROMAN_NAME_MAX} caracteres.`)
  .regex(ROMAN_NAME_REGEX, "Sólo letras. Sin números, espacios ni símbolos.");

export const baptizeOperatorSchema = z.object({
  operatorName: romanNameSchema,
});

export const baptizeExocortexSchema = z.object({
  exocortexName: z
    .string()
    .trim()
    .max(ROMAN_NAME_MAX, `Máximo ${ROMAN_NAME_MAX} caracteres.`)
    .optional()
    .nullable()
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .superRefine((value, ctx) => {
      if (value == null) return;
      if (!ROMAN_NAME_REGEX.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sólo letras. Sin números, espacios ni símbolos.",
        });
      }
    }),
});

export const patchYoSchema = z.object({
  operationalStatus: z.enum(OPERATIONAL_STATUSES).optional(),
  energyLevel: z.number().int().min(1).max(12).optional(),
  calibrationEntry: z
    .object({
      promptId: z.string().trim().min(1).max(80),
      answer: z.string().trim().min(1).max(500),
    })
    .optional(),
});

export type PatchYoInput = z.infer<typeof patchYoSchema>;

export const conduitMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});
