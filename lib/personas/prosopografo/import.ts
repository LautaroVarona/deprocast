import "server-only";

import { parsePersonaCrm } from "@/lib/personas/crm-modules";
import { createPersonaWithRelations } from "@/lib/personas/create-with-relations";
import type {
  Persona,
  PersonaConnectionDraft,
} from "@/lib/personas/model";
import type { ProsopografoPersonaRaw } from "@/lib/personas/prosopografo/schema";
import { resolveConnectionsByName } from "@/lib/personas/prosopografo/resolve-connections";
import { sealKgNodeInUniverse } from "@/lib/personas/universe-seal";

export type ProsopografoImportPreviewItem = {
  nombrePrincipal: string;
  aliases: string[];
  crmModulesFilled: string[];
  connectionCount: number;
  warnings: string[];
};

export type ProsopografoImportResult = {
  created: Persona[];
  errors: Array<{ nombrePrincipal: string; error: string }>;
  warnings: string[];
};

function filledCrmModules(
  crm: ReturnType<typeof parsePersonaCrm>,
): string[] {
  const keys: Array<keyof typeof crm> = [
    "identity",
    "contacto",
    "proyectos",
    "red",
    "oportunidades",
    "telemetria",
  ];
  return keys.filter((key) => {
    const mod = crm[key];
    return Boolean(mod && Object.keys(mod).length > 0);
  });
}

function buildCrmForImport(raw: ProsopografoPersonaRaw) {
  const crm = parsePersonaCrm(raw.crm ?? {});
  const telemetria = {
    ...(crm.telemetria ?? {}),
    origenIngesta: crm.telemetria?.origenIngesta || "prosopografo",
    estadoRegistro: crm.telemetria?.estadoRegistro || "verificado",
  };
  return { ...crm, telemetria };
}

function idConnectionsFromRaw(
  raw: ProsopografoPersonaRaw,
): PersonaConnectionDraft[] {
  if (!raw.connections?.length) return [];
  return raw.connections.map((c) => ({
    targetId: c.targetId,
    targetKind: c.targetKind,
    targetLabel: c.targetLabel?.trim() || c.targetId,
    relationContext: c.relationContext,
    relationType: c.relationType,
    strength: c.strength,
  }));
}

export async function previewProsopografoPersonas(
  personas: ProsopografoPersonaRaw[],
): Promise<ProsopografoImportPreviewItem[]> {
  const previews: ProsopografoImportPreviewItem[] = [];

  for (const raw of personas) {
    const nombre = raw.nombrePrincipal.trim();
    const crm = buildCrmForImport(raw);
    const resolved = await resolveConnectionsByName(
      raw.connectionsByName,
      nombre,
    );
    const idConnections = idConnectionsFromRaw(raw);
    previews.push({
      nombrePrincipal: nombre,
      aliases: Array.isArray(raw.aliases)
        ? raw.aliases.filter((a) => typeof a === "string" && a.trim())
        : [],
      crmModulesFilled: filledCrmModules(crm),
      connectionCount: resolved.connections.length + idConnections.length,
      warnings: resolved.warnings,
    });
  }

  return previews;
}

export async function importPersonasFromProsopografo(
  personas: ProsopografoPersonaRaw[],
  universeSlug?: string,
): Promise<ProsopografoImportResult> {
  const created: Persona[] = [];
  const errors: Array<{ nombrePrincipal: string; error: string }> = [];
  const warnings: string[] = [];

  for (const raw of personas) {
    const nombrePrincipal = raw.nombrePrincipal.trim();
    try {
      const crm = buildCrmForImport(raw);
      const resolved = await resolveConnectionsByName(
        raw.connectionsByName,
        nombrePrincipal,
      );
      warnings.push(...resolved.warnings);

      const connections: PersonaConnectionDraft[] = [
        ...idConnectionsFromRaw(raw),
        ...resolved.connections,
      ];

      const relationToOperator =
        raw.relationToOperator?.trim() ||
        crm.identity?.vinculoOperador?.trim() ||
        undefined;

      const persona = await createPersonaWithRelations({
        nombrePrincipal,
        aliases: raw.aliases,
        notasGenerales:
          raw.notasGenerales?.trim() ||
          crm.telemetria?.notasTranscripciones ||
          "",
        relationToOperator,
        connections,
        crm,
      });

      await sealKgNodeInUniverse(
        persona.id,
        universeSlug,
        persona.nombrePrincipal,
      );
      created.push(persona);
    } catch (error) {
      errors.push({
        nombrePrincipal,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo importar la persona.",
      });
    }
  }

  return { created, errors, warnings };
}
