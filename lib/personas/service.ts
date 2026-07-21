import { mergeAliases, resolveEntities } from "@/lib/kg/identity";
import { normalizeName, parseAliasesJson, parseMetadataJson } from "@/lib/kg/normalize";
import type { PersonaKind } from "@/lib/kg/types";
import { isPersonaKind } from "@/lib/kg/types";
import {
  buildPersonaMetadata,
  kgNodeToPersona,
} from "@/lib/personas/mappers";
import { getPersonaByIdOrSlug } from "@/lib/personas/queries";
import type {
  CreatePersonaPayload,
  Persona,
  UpdatePersonaPayload,
} from "@/lib/personas/model";
import type { CreatePersonaInput, PersonaDetailDto } from "@/lib/personas/types";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function sanitizeAliases(
  nombrePrincipal: string,
  aliases: string[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const primaryNorm = normalizeName(nombrePrincipal);

  for (const alias of aliases) {
    const trimmed = alias.trim();
    if (!trimmed) continue;
    const norm = normalizeName(trimmed);
    if (norm === primaryNorm || seen.has(norm)) continue;
    seen.add(norm);
    result.push(trimmed);
  }

  return result;
}

function buildLegacyMetadata(input: CreatePersonaInput): Record<string, unknown> {
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

async function assertPersonaNode(id: string) {
  const node = await prisma.kgNode.findFirst({
    where: { id, type: "persona" },
  });
  if (!node) throw new Error("Persona no encontrada.");
  return node;
}

export async function getPersonaEntity(idOrSlug: string): Promise<Persona | null> {
  const detail = await getPersonaByIdOrSlug(idOrSlug);
  if (!detail) return null;

  const node = await prisma.kgNode.findUnique({ where: { id: detail.id } });
  return node ? kgNodeToPersona(node) : null;
}

export async function createPersonaEntity(
  input: CreatePersonaPayload,
): Promise<Persona> {
  const nombrePrincipal = input.nombrePrincipal.trim();
  if (!nombrePrincipal) {
    throw new Error("El nombre principal es obligatorio.");
  }

  const aliases = sanitizeAliases(nombrePrincipal, input.aliases ?? []);
  const metadata = buildPersonaMetadata({
    notasGenerales: input.notasGenerales ?? "",
  });

  const nameToIdMap = await resolveEntities(
    [
      {
        name: nombrePrincipal,
        type: "persona",
        aliases,
        personaKind: "fisica",
        metadata,
        confidence: 0.85,
      },
    ],
    { reconocido: true },
  );

  const nodeId = [...nameToIdMap.values()][0];
  if (!nodeId) {
    throw new Error("No se pudo resolver la identidad de la persona.");
  }

  const existing = await prisma.kgNode.findUnique({ where: { id: nodeId } });
  if (existing) {
    const mergedMeta = buildPersonaMetadata({
      existing: parseMetadataJson(existing.metadata),
      notasGenerales: input.notasGenerales ?? "",
    });
    const updated = await mergeAliases(existing, aliases);
    await prisma.kgNode.update({
      where: { id: updated.id },
      data: {
        aliases: sanitizeAliases(nombrePrincipal, [
          ...parseAliasesJson(updated.aliases),
          ...aliases,
        ]),
        metadata: mergedMeta as Prisma.InputJsonValue,
        reconocido: true,
      },
    });
  }

  const node = await prisma.kgNode.findUniqueOrThrow({ where: { id: nodeId } });
  return kgNodeToPersona(node);
}

/** Crea o unifica una persona (API legacy del CRM). */
export async function createPersona(
  input: CreatePersonaInput,
): Promise<PersonaDetailDto> {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre es obligatorio.");

  const personaKind: PersonaKind =
    input.personaKind && isPersonaKind(input.personaKind)
      ? input.personaKind
      : "fisica";

  const aliases = sanitizeAliases(name, input.aliases ?? []);
  const metadata = buildLegacyMetadata(input);

  const nameToIdMap = await resolveEntities(
    [
      {
        name,
        type: "persona",
        aliases,
        personaKind,
        metadata,
        confidence: 0.85,
      },
    ],
    { reconocido: true },
  );

  const nodeId = [...nameToIdMap.values()][0];
  if (!nodeId) throw new Error("No se pudo resolver la identidad de la persona.");

  const existing = await prisma.kgNode.findUnique({ where: { id: nodeId } });
  if (existing && Object.keys(metadata).length > 0) {
    const merged = {
      ...parseMetadataJson(existing.metadata),
      ...metadata,
    };
    await prisma.kgNode.update({
      where: { id: nodeId },
      data: {
        metadata: merged as Prisma.InputJsonValue,
        reconocido: true,
      },
    });
  } else if (existing && !existing.reconocido) {
    await prisma.kgNode.update({
      where: { id: nodeId },
      data: { reconocido: true },
    });
  }

  const detail = await getPersonaByIdOrSlug(nodeId);
  if (!detail) {
    throw new Error("La persona fue creada pero no se pudo cargar su ficha.");
  }
  return detail;
}

export async function updatePersonaEntity(
  id: string,
  input: UpdatePersonaPayload,
): Promise<Persona> {
  const node = await assertPersonaNode(id);
  const existingMeta = parseMetadataJson(node.metadata);
  const nombrePrincipal = input.nombrePrincipal?.trim() ?? node.primaryName;
  const aliases = sanitizeAliases(
    nombrePrincipal,
    input.aliases ?? parseAliasesJson(node.aliases),
  );
  const metadata = buildPersonaMetadata({
    existing: existingMeta,
    notasGenerales:
      input.notasGenerales !== undefined ? input.notasGenerales : undefined,
  });

  try {
    const updated = await prisma.kgNode.update({
      where: { id },
      data: {
        primaryName: nombrePrincipal,
        aliases,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
    return kgNodeToPersona(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(
        "Ya existe otra persona con ese nombre principal. Usá un alias en su lugar.",
      );
    }
    throw error;
  }
}

/** Elimina persona y aristas/menciones en cascada (onDelete: Cascade en schema). */
export async function deletePersonaEntity(id: string): Promise<void> {
  await assertPersonaNode(id);
  await prisma.kgNode.delete({ where: { id } });
}

/** Sella una candidata como persona verificada en el grafo principal. */
export async function promotePersona(id: string): Promise<Persona> {
  await assertPersonaNode(id);
  const updated = await prisma.kgNode.update({
    where: { id },
    data: { reconocido: true },
  });
  return kgNodeToPersona(updated);
}

/**
 * Fusiona identidad: `dropId` (alias/mención errónea) se absorbe en `keepId` (canónica).
 * El nodo canónico queda sellado como verificado.
 */
export async function mergePersonaIdentities(
  keepId: string,
  dropId: string,
): Promise<{
  persona: Persona;
  movedEdges: number;
  movedMentions: number;
  mergedAliases: number;
}> {
  if (keepId === dropId) {
    throw new Error("Seleccioná dos personas distintas para fusionar.");
  }

  const [keep, drop] = await Promise.all([
    assertPersonaNode(keepId),
    assertPersonaNode(dropId),
  ]);

  if (keep.type !== "persona" || drop.type !== "persona") {
    throw new Error("Solo se pueden fusionar nodos de tipo persona.");
  }

  const { mergeNodes } = await import("@/lib/kg/merge");
  const result = await mergeNodes(keepId, dropId);

  const sealed = await prisma.kgNode.update({
    where: { id: keepId },
    data: { reconocido: true },
  });

  return {
    persona: kgNodeToPersona(sealed),
    movedEdges: result.movedEdges,
    movedMentions: result.movedMentions,
    mergedAliases: result.mergedAliases,
  };
}
