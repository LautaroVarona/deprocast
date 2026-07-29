import { z } from "zod";
import { PROJECT_TIPOS } from "@/lib/projects/types";

export const hermeticScale = z.coerce.number().int().min(1).max(12);

export const gravityMetricsSchema = z
  .object({
    priority: hermeticScale.optional(),
    impact: hermeticScale.optional(),
    friction: hermeticScale.optional(),
    prioridad: hermeticScale.optional(),
    impacto: hermeticScale.optional(),
    dificultad: hermeticScale.optional(),
  })
  .optional();

export const importProjectSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio."),
  description: z.string().optional().default(""),
  status: z.string().optional(),
  estado: z.string().optional(),
  tipo: z.enum(PROJECT_TIPOS).nullable().optional(),
  campoSlug: z.string().optional(),
  gravityMetrics: gravityMetricsSchema,
  prioridad: hermeticScale.optional(),
  impacto: hermeticScale.optional(),
  dificultad: hermeticScale.optional(),
  microtareas: z.array(z.string()).optional(),
  hitos: z.array(z.string()).optional(),
  responsable: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaObjetivo: z.string().optional(),
  horasEstimadas: z.coerce.number().min(0).optional(),
});

export type ProjectJsonTemplate = z.infer<typeof importProjectSchema>;

/** Plantilla canónica para IAs externas / Exportar Códice. */
export const PROJECT_JSON_TEMPLATE: ProjectJsonTemplate = {
  title: "Nombre del proyecto",
  description: "Contexto operativo y resultado esperado.",
  status: "Desarrollo",
  tipo: "proyecto",
  campoSlug: "babel",
  gravityMetrics: {
    priority: 6,
    impact: 6,
    friction: 6,
  },
  microtareas: [
    "Hito 1 — Definir alcance mínimo viable",
    "Hito 2 — Primer entregable operable",
    "Hito 3 — Criterio de cierre",
  ],
  responsable: "",
  fechaInicio: "",
  fechaObjetivo: "",
  horasEstimadas: 0,
};
