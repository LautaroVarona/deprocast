import { resolveEntities } from "@/lib/kg/identity";
import { parseMetadataJson } from "@/lib/kg/normalize";
import type { PersonaKind } from "@/lib/kg/types";
import { isPersonaKind } from "@/lib/kg/types";
import { prisma } from "@/lib/prisma";
import { getPersonaByIdOrSlug } from "@/lib/personas/queries";
import type { CreatePersonaInput, PersonaDetailDto } from "@/lib/personas/types";
import { Prisma } from "@prisma/client";

function buildMetadata(input: CreatePersonaInput): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  if (input.role?.trim()) {
    metadata.primaryRole = input.role.trim();
    metadata.roles = [input.role.trim()];
  }
  if (input.campoSlug?.trim()) {
    metadata.campoSlug = input.campoSlug.trim();
  }

  return metadata;
}

/**
 * Crea o unifica una persona manualmente usando las reglas de identidad del KG.
 * Si un alias o nombre fuzzy ya existe, la mención se asocia al nodo existente.
 */
export async function createPersona(
  input: CreatePersonaInput,
): Promise<PersonaDetailDto> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("El nombre es obligatorio.");
  }

  const personaKind: PersonaKind =
    input.personaKind && isPersonaKind(input.personaKind)
      ? input.personaKind
      : "fisica";

  const aliases = (input.aliases ?? []).map((alias) => alias.trim()).filter(Boolean);
  const metadata = buildMetadata(input);

  const nameToIdMap = await resolveEntities([
    {
      name,
      type: "persona",
      aliases,
      personaKind,
      metadata,
      confidence: 0.85,
    },
  ]);

  const nodeId = [...nameToIdMap.values()][0];
  if (!nodeId) {
    throw new Error("No se pudo resolver la identidad de la persona.");
  }

  const existing = await prisma.kgNode.findUnique({ where: { id: nodeId } });
  if (existing && Object.keys(metadata).length > 0) {
    const merged = {
      ...parseMetadataJson(existing.metadata),
      ...metadata,
    };
    await prisma.kgNode.update({
      where: { id: nodeId },
      data: { metadata: merged as Prisma.InputJsonValue },
    });
  }

  const detail = await getPersonaByIdOrSlug(nodeId);
  if (!detail) {
    throw new Error("La persona fue creada pero no se pudo cargar su ficha.");
  }

  return detail;
}
