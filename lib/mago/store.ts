import "server-only";

import { MAGO_SLOT_COUNT } from "@/lib/mago/constants";
import { ensureMagoRuntime } from "@/lib/mago/ensure-schema";
import type {
  MagoColeccionDetailDto,
  MagoColeccionDto,
  MagoColeccionKind,
  MagoRefKind,
} from "@/lib/mago/types";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const VALID_KINDS = new Set<MagoColeccionKind>([
  "generic",
  "proyectos",
  "libro_rojo",
  "capitulos",
]);

const VALID_REF_KINDS = new Set<MagoRefKind>(["project", "pending_task", "none"]);

function assertIndex(index: number): void {
  if (!Number.isInteger(index) || index < 1 || index > MAGO_SLOT_COUNT) {
    throw new Error(`Índice inválido: debe ser un entero entre 1 y ${MAGO_SLOT_COUNT}.`);
  }
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toColeccionDto(
  row: {
    id: string;
    nombre: string;
    descripcion: string;
    kind: string;
    createdAt: Date;
    updatedAt: Date;
    items: { titulo: string }[];
  },
): MagoColeccionDto {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    kind: (VALID_KINDS.has(row.kind as MagoColeccionKind)
      ? row.kind
      : "generic") as MagoColeccionKind,
    itemCount: row.items.length,
    filledCount: row.items.filter((item) => item.titulo.trim().length > 0).length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetailDto(
  row: {
    id: string;
    nombre: string;
    descripcion: string;
    kind: string;
    createdAt: Date;
    updatedAt: Date;
    items: {
      id: string;
      slot: number;
      titulo: string;
      contenido: string;
      refKind: string;
      refId: string | null;
      metadata: unknown;
    }[];
  },
): MagoColeccionDetailDto {
  return {
    ...toColeccionDto(row),
    items: row.items
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((item) => ({
        id: item.id,
        index: item.slot,
        titulo: item.titulo,
        contenido: item.contenido,
        refKind: (VALID_REF_KINDS.has(item.refKind as MagoRefKind)
          ? item.refKind
          : "none") as MagoRefKind,
        refId: item.refId,
        metadata: parseMetadata(item.metadata),
      })),
  };
}

export async function listMagoColecciones(): Promise<MagoColeccionDto[]> {
  await ensureMagoRuntime();
  const rows = await prisma.magoColeccion.findMany({
    include: { items: { select: { titulo: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => toColeccionDto(row));
}

export async function getMagoColeccion(
  id: string,
): Promise<MagoColeccionDetailDto | null> {
  await ensureMagoRuntime();
  const row = await prisma.magoColeccion.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!row) return null;
  return toDetailDto(row);
}

export async function listMagoColeccionesWithItems() {
  await ensureMagoRuntime();
  return prisma.magoColeccion.findMany({
    include: { items: true },
    orderBy: { updatedAt: "desc" },
  });
}

export type CreateMagoColeccionInput = {
  nombre: string;
  descripcion?: string;
  kind?: MagoColeccionKind;
  seedSlots?: boolean;
};

export async function createMagoColeccion(
  input: CreateMagoColeccionInput,
): Promise<MagoColeccionDetailDto> {
  await ensureMagoRuntime();
  const nombre = input.nombre.trim();
  if (!nombre) {
    throw new Error("El nombre de la colección es obligatorio.");
  }

  const kind = input.kind ?? "generic";
  if (!VALID_KINDS.has(kind)) {
    throw new Error(`Tipo de colección inválido: ${kind}`);
  }

  const seedSlots = input.seedSlots !== false;

  const row = await prisma.magoColeccion.create({
    data: {
      nombre,
      descripcion: input.descripcion?.trim() ?? "",
      kind,
      items: seedSlots
        ? {
            create: Array.from({ length: MAGO_SLOT_COUNT }, (_, i) => ({
              slot: i + 1,
              titulo: "",
              contenido: "",
              refKind: "none",
              metadata: {} as Prisma.InputJsonValue,
            })),
          }
        : undefined,
    },
    include: { items: true },
  });

  return toDetailDto(row);
}

export type UpdateMagoItemInput = {
  titulo?: string;
  contenido?: string;
  refKind?: MagoRefKind;
  refId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function updateMagoColeccionItem(
  coleccionId: string,
  index: number,
  input: UpdateMagoItemInput,
): Promise<MagoColeccionDetailDto> {
  await ensureMagoRuntime();
  assertIndex(index);

  const coleccion = await prisma.magoColeccion.findUnique({
    where: { id: coleccionId },
  });
  if (!coleccion) {
    throw new Error("Colección no encontrada.");
  }

  const refKind = input.refKind ?? undefined;
  if (refKind !== undefined && !VALID_REF_KINDS.has(refKind)) {
    throw new Error(`refKind inválido: ${refKind}`);
  }

  const data: {
    titulo?: string;
    contenido?: string;
    refKind?: string;
    refId?: string | null;
    metadata?: Prisma.InputJsonValue;
  } = {};

  if (input.titulo !== undefined) data.titulo = input.titulo.trim();
  if (input.contenido !== undefined) data.contenido = input.contenido;
  if (refKind !== undefined) data.refKind = refKind;
  if (input.refId !== undefined) {
    data.refId = input.refId?.trim() || null;
  }
  if (input.metadata !== undefined) {
    data.metadata = input.metadata as Prisma.InputJsonValue;
  }

  if (data.refKind === "none") {
    data.refId = null;
  }

  await prisma.magoColeccionItem.upsert({
    where: {
      coleccionId_slot: { coleccionId, slot: index },
    },
    create: {
      coleccionId,
      slot: index,
      titulo: data.titulo ?? "",
      contenido: data.contenido ?? "",
      refKind: data.refKind ?? "none",
      refId: data.refId ?? null,
      metadata: data.metadata ?? ({} as Prisma.InputJsonValue),
    },
    update: data,
  });

  const detail = await getMagoColeccion(coleccionId);
  if (!detail) {
    throw new Error("Colección no encontrada tras actualizar.");
  }
  return detail;
}
