import "server-only";

import {
  MAX_TRENCHES_WEIGHT,
  MIN_TRENCHES_WEIGHT,
  ROOT_UNIVERSE_LABEL,
  ROOT_UNIVERSE_SLUG,
} from "@/lib/babel/constants";
import type {
  CreateUniverseInput,
  UniverseDto,
} from "@/lib/babel/types";
import { slugifyCampoInput } from "@/lib/projects/campos";
import { getDataPath } from "@/lib/runtime-paths";
import { prisma } from "@/lib/prisma";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Universe } from "@prisma/client";

export const UNIVERSE_META_FILENAME = ".universo.json";

function mapUniverse(row: Universe): UniverseDto {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    description: row.description,
    trenchesWeight: row.trenchesWeight,
    isRoot: row.isRoot,
    discoveredAt: row.discoveredAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getUniverseDir(slug: string): string {
  return getDataPath("universes", slug);
}

function getUniverseMetaPath(slug: string): string {
  return path.join(getUniverseDir(slug), UNIVERSE_META_FILENAME);
}

async function writeUniverseMeta(universe: UniverseDto): Promise<void> {
  const dir = getUniverseDir(universe.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(
    getUniverseMetaPath(universe.slug),
    JSON.stringify(
      {
        slug: universe.slug,
        label: universe.label,
        description: universe.description,
        trenchesWeight: universe.trenchesWeight,
        isRoot: universe.isRoot,
        discoveredAt: universe.discoveredAt,
      },
      null,
      2,
    ),
    "utf8",
  );
}

/** Garantiza que el universo raíz Babel exista (idempotente). */
export async function ensureRootUniverse(): Promise<UniverseDto> {
  const existing = await prisma.universe.findUnique({
    where: { slug: ROOT_UNIVERSE_SLUG },
  });

  if (existing) {
    return mapUniverse(existing);
  }

  const row = await prisma.universe.create({
    data: {
      slug: ROOT_UNIVERSE_SLUG,
      label: ROOT_UNIVERSE_LABEL,
      description: "Universo raíz — red de captura principal del sistema.",
      isRoot: true,
    },
  });

  const dto = mapUniverse(row);
  await writeUniverseMeta(dto);
  return dto;
}

export async function listUniverses(): Promise<UniverseDto[]> {
  await ensureRootUniverse();

  const rows = await prisma.universe.findMany({
    orderBy: [{ isRoot: "desc" }, { label: "asc" }],
  });

  return rows.map(mapUniverse);
}

export async function getUniverseBySlug(
  slug: string,
): Promise<UniverseDto | null> {
  const row = await prisma.universe.findUnique({ where: { slug } });
  return row ? mapUniverse(row) : null;
}

/** Descubrir un plano de proyección vacío (sin tablas de datos nuevas). */
export async function discoverUniverse(
  input: CreateUniverseInput,
): Promise<UniverseDto> {
  await ensureRootUniverse();

  const label = input.label.trim();
  if (!label) {
    throw new Error("El nombre del Universo es obligatorio.");
  }

  const slug = slugifyCampoInput(label);
  if (!slug || slug === ROOT_UNIVERSE_SLUG) {
    throw new Error("El nombre del Universo no genera un slug válido.");
  }

  const existing = await prisma.universe.findUnique({ where: { slug } });
  if (existing) {
    throw new Error(`Ya existe un Universo con slug "${slug}".`);
  }

  const row = await prisma.universe.create({
    data: {
      slug,
      label,
      description: input.description?.trim() ?? "",
      isRoot: false,
    },
  });

  const dto = mapUniverse(row);
  await writeUniverseMeta(dto);
  return dto;
}

export async function calibrateUniverse(
  slug: string,
  trenchesWeight: number,
): Promise<UniverseDto> {
  const clamped = Math.min(
    MAX_TRENCHES_WEIGHT,
    Math.max(MIN_TRENCHES_WEIGHT, Math.round(trenchesWeight)),
  );

  const row = await prisma.universe.update({
    where: { slug },
    data: { trenchesWeight: clamped },
  });

  const dto = mapUniverse(row);
  await writeUniverseMeta(dto);
  return dto;
}
