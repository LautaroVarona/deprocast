import "server-only";

import { createPersonaWithRelations } from "@/lib/personas/create-with-relations";
import { listProjects } from "@/lib/projects/service";
import { bootstrapGenesisProject } from "@/lib/projects/genesis-bootstrap";
import { countOperatorLinkedPersonas } from "@/lib/yo/senado-graph";
import { ensureOperatorPersonaNode } from "@/lib/yo/operator-node";
import type { YoIdentitySnapshot } from "@/lib/yo/identity-snapshot";
import { CONSECRATION_PERSONA_TARGET } from "@/lib/yo/types";

/**
 * Recrea hub Operador + Senado + Prima Materia desde el ancla cuando
 * SQLite quedó vacío (cold start Vercel / seed fresco).
 */
export async function rehydrateGenesisGraphFromSnapshot(
  snap: YoIdentitySnapshot,
): Promise<void> {
  const operator = await ensureOperatorPersonaNode(snap.operatorName);
  if (!operator) return;

  const linked = await countOperatorLinkedPersonas();
  if (linked < CONSECRATION_PERSONA_TARGET && snap.senado.length > 0) {
    for (const member of snap.senado) {
      try {
        await createPersonaWithRelations({
          nombrePrincipal: member.name,
          aliases: [],
          notasGenerales: "",
          relationToOperator: member.vinculo,
          connections: [],
        });
      } catch (error) {
        // Nombre ya existe / vínculo ya creado: seguir con el resto.
        console.warn(
          `[genesis] rehydrate senado «${member.name}» skipped:`,
          error,
        );
      }
    }
  }

  if (!snap.prima?.title.trim()) return;

  const title = snap.prima.title.trim();
  const existing = await listProjects();
  const already = existing.some(
    (project) => project.title.trim().toLowerCase() === title.toLowerCase(),
  );
  if (already) return;

  try {
    await bootstrapGenesisProject({
      title,
      why: snap.prima.why,
      operatorName: snap.operatorName,
    });
  } catch (error) {
    console.warn("[genesis] rehydrate prima skipped:", error);
  }
}
