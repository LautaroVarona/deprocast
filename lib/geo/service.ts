import "server-only";

import { geocodeAddress } from "@/lib/geo/geocode";
import type {
  CreateGeoLocationInput,
  GeoLocationDto,
  UpdateGeoLocationInput,
} from "@/lib/geo/types";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function parseMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toDto(row: {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  isPermanent: boolean;
  source: string;
  placeId: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): GeoLocationDto {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    isPermanent: row.isPermanent,
    source: row.source,
    placeId: row.placeId,
    metadata: parseMetadata(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listGeoLocations(options?: {
  permanentOnly?: boolean;
}): Promise<GeoLocationDto[]> {
  const rows = await prisma.geoLocation.findMany({
    where: options?.permanentOnly ? { isPermanent: true } : undefined,
    orderBy: [{ isPermanent: "desc" }, { name: "asc" }],
  });
  return rows.map(toDto);
}

export async function getGeoLocationById(
  id: string,
): Promise<GeoLocationDto | null> {
  const row = await prisma.geoLocation.findUnique({ where: { id } });
  return row ? toDto(row) : null;
}

export async function createGeoLocation(
  input: CreateGeoLocationInput,
): Promise<GeoLocationDto> {
  let latitude = input.latitude;
  let longitude = input.longitude;
  let placeId = input.placeId ?? null;
  let source = input.source ?? "manual";
  let address = input.address ?? null;

  if (
    (latitude === undefined || longitude === undefined) &&
    input.address?.trim()
  ) {
    const geo = await geocodeAddress(input.address);
    latitude = geo.latitude;
    longitude = geo.longitude;
    placeId = geo.placeId;
    source = "geocode";
    if (!address) address = geo.displayName;
  }

  if (latitude === undefined || longitude === undefined) {
    throw new Error(
      "Se requieren coordenadas (latitude/longitude) o una dirección geocodificable.",
    );
  }

  const row = await prisma.geoLocation.create({
    data: {
      name: input.name.trim(),
      address,
      latitude,
      longitude,
      isPermanent: input.isPermanent ?? false,
      source,
      placeId,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  return toDto(row);
}

export async function updateGeoLocation(
  id: string,
  input: UpdateGeoLocationInput,
): Promise<GeoLocationDto> {
  const existing = await prisma.geoLocation.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Ubicación no encontrada.");
  }

  let latitude = input.latitude;
  let longitude = input.longitude;
  let placeId = input.placeId;
  let address = input.address;

  if (
    input.address &&
    input.address.trim() &&
    (latitude === undefined || longitude === undefined)
  ) {
    const geo = await geocodeAddress(input.address);
    latitude = geo.latitude;
    longitude = geo.longitude;
    placeId = geo.placeId;
  }

  const row = await prisma.geoLocation.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
      ...(input.isPermanent !== undefined
        ? { isPermanent: input.isPermanent }
        : {}),
      ...(placeId !== undefined ? { placeId } : {}),
      ...(input.metadata !== undefined
        ? { metadata: input.metadata as Prisma.InputJsonValue }
        : {}),
    },
  });

  return toDto(row);
}

export async function deleteGeoLocation(id: string): Promise<void> {
  await prisma.geoLocation.delete({ where: { id } });
}

type SeedSpec = {
  name: string;
  addressEnv: string;
  fallbackAddress: string;
  metadata?: Record<string, unknown>;
};

const PERMANENT_SEEDS: SeedSpec[] = [
  {
    name: "Varona HQ",
    addressEnv: "GEO_VARONA_ADDRESS",
    fallbackAddress: "Paterna, Valencia, España",
    metadata: { role: "hq", label: "Oficina Varona" },
  },
  {
    name: "Casa",
    addressEnv: "GEO_HOME_ADDRESS",
    fallbackAddress: "Paterna, Valencia, España",
    metadata: { role: "home", label: "Centro de operaciones" },
  },
];

/**
 * Crea hitos permanentes si aún no existen (idempotente por nombre).
 * Geocodifica direcciones desde env o fallback; no inventa coords.
 */
export async function ensurePermanentLocationsSeeded(): Promise<
  GeoLocationDto[]
> {
  const created: GeoLocationDto[] = [];

  for (const seed of PERMANENT_SEEDS) {
    const existing = await prisma.geoLocation.findFirst({
      where: { name: seed.name, isPermanent: true },
    });
    if (existing) {
      created.push(toDto(existing));
      continue;
    }

    const address =
      process.env[seed.addressEnv]?.trim() || seed.fallbackAddress;

    try {
      const dto = await createGeoLocation({
        name: seed.name,
        address,
        isPermanent: true,
        source: "geocode",
        metadata: seed.metadata,
      });
      created.push(dto);
    } catch (error) {
      console.warn(
        `[geo] No se pudo seedear "${seed.name}" (${address}):`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return created;
}
