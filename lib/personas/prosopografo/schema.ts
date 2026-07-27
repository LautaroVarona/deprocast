import { z } from "zod";

const connectionByNameSchema = z.object({
  targetKind: z.enum(["persona", "proyecto"]),
  targetName: z.string().min(1),
  relationContext: z.string().min(1),
  relationType: z.string().optional(),
  strength: z.number().optional(),
});

const personaImportItemSchema = z.object({
  nombrePrincipal: z.string().min(1),
  aliases: z.array(z.string()).optional(),
  notasGenerales: z.string().optional(),
  relationToOperator: z.string().optional(),
  crm: z.record(z.unknown()).optional(),
  connectionsByName: z.array(connectionByNameSchema).optional(),
  /** Compat: connections con IDs si el LLM las tuviera (raro). */
  connections: z
    .array(
      z.object({
        targetId: z.string().min(1),
        targetKind: z.enum(["persona", "proyecto"]),
        targetLabel: z.string().optional(),
        relationContext: z.string().min(1),
        relationType: z.string().optional(),
        strength: z.number().optional(),
      }),
    )
    .optional(),
});

export type ProsopografoConnectionByName = z.infer<
  typeof connectionByNameSchema
>;
export type ProsopografoPersonaRaw = z.infer<typeof personaImportItemSchema>;

export const prosopografoImportEnvelopeSchema = z.union([
  z.object({ personas: z.array(personaImportItemSchema).min(1) }),
  z.array(personaImportItemSchema).min(1),
  personaImportItemSchema,
]);

export type ProsopografoImportEnvelope = z.infer<
  typeof prosopografoImportEnvelopeSchema
>;

export function normalizeToPersonaList(
  envelope: ProsopografoImportEnvelope,
): ProsopografoPersonaRaw[] {
  if (Array.isArray(envelope)) return envelope;
  if ("personas" in envelope && Array.isArray(envelope.personas)) {
    return envelope.personas;
  }
  return [envelope];
}
