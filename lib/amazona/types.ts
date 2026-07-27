import { z } from "zod";

import { isPowerId, type PowerId } from "@/lib/mago/powers";

const powerIdSchema = z
  .string()
  .refine((value): value is PowerId => isPowerId(value), {
    message: "PowerId inválido. Usá P01–P72.",
  });

export const createAmazonAResourceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().default(""),
  powerIds: z
    .array(powerIdSchema)
    .min(1, "Cada recurso AmazonA debe tener al menos un Poder.")
    .max(72),
  projectId: z.string().trim().min(1).max(120).optional().nullable(),
});

export const updateAmazonAResourceSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  powerIds: z
    .array(powerIdSchema)
    .min(1, "Cada recurso AmazonA debe tener al menos un Poder.")
    .max(72)
    .optional(),
  projectId: z.string().trim().min(1).max(120).optional().nullable(),
});

export type CreateAmazonAResourceInput = z.infer<
  typeof createAmazonAResourceSchema
>;
export type UpdateAmazonAResourceInput = z.infer<
  typeof updateAmazonAResourceSchema
>;

export type AmazonAResourceDto = {
  id: string;
  name: string;
  description: string;
  powerIds: PowerId[];
  kgNodeId: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
};

export const assignAmazonAToEventSchema = z.object({
  resourceId: z.string().min(1),
  eventId: z.string().min(1).optional(),
  /** Si no hay eventId, crea un bloque SUGGESTION en este instante. */
  occurredAt: z.coerce.date().optional(),
  durationMin: z.number().int().min(5).max(480).optional(),
});

export type AssignAmazonAToEventInput = z.infer<
  typeof assignAmazonAToEventSchema
>;
