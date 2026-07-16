import { z } from "zod";

export const geoPayloadSchema = z.object({
  locationId: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  label: z.string().optional(),
});

export type GeoPayload = z.infer<typeof geoPayloadSchema>;

export const createGeoLocationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isPermanent: z.boolean().optional(),
  source: z.enum(["manual", "geocode", "import"]).optional(),
  placeId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateGeoLocationInput = z.infer<typeof createGeoLocationSchema>;

export const updateGeoLocationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isPermanent: z.boolean().optional(),
  placeId: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateGeoLocationInput = z.infer<typeof updateGeoLocationSchema>;

export const geocodeRequestSchema = z.object({
  address: z.string().min(1),
});

export type GeoLocationDto = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  isPermanent: boolean;
  source: string;
  placeId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GeoFeature = {
  id: string;
  kind: "permanent" | "temporal";
  latitude: number;
  longitude: number;
  label: string;
  address?: string | null;
  locationId?: string;
  blockId?: string;
  blockKind?: "task" | "event";
};

export type GeoMapSnapshot = {
  from: string;
  to: string;
  universe: string | null;
  permanent: GeoLocationDto[];
  temporal: Array<{
    blockId: string;
    blockKind: "task" | "event";
    title: string;
    start: string;
    status: string;
    location: GeoPayload | GeoLocationDto;
  }>;
};

export function parseGeoPayload(
  value: unknown,
): GeoPayload | null {
  const result = geoPayloadSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function extractLocationFromStructuredData(
  structuredData: Record<string, unknown> | null | undefined,
): GeoPayload | null {
  if (!structuredData || typeof structuredData !== "object") return null;
  const raw = structuredData.location;
  if (!raw || typeof raw !== "object") return null;
  return parseGeoPayload(raw);
}
