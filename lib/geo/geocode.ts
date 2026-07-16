import "server-only";

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  placeId: string;
  displayName: string;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Deprocast/0.1 (local-first cognitive OS; contact: deprocast@local)";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const MIN_REQUEST_GAP_MS = 1100;

type CacheEntry = {
  result: GeocodeResult;
  expiresAt: number;
};

const geocodeCache = new Map<string, CacheEntry>();
let lastRequestAt = 0;

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const wait = MIN_REQUEST_GAP_MS - (now - lastRequestAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

export async function geocodeAddress(
  address: string,
): Promise<GeocodeResult> {
  const trimmed = address.trim();
  if (!trimmed) {
    throw new Error("La dirección está vacía.");
  }

  const key = normalizeAddress(trimmed);
  const cached = geocodeCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  await waitForRateLimit();

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Nominatim respondió ${response.status}. No se pudo geocodificar.`,
    );
  }

  const data = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
    place_id?: number | string;
    display_name?: string;
  }>;

  const hit = data[0];
  if (!hit?.lat || !hit?.lon) {
    throw new Error(`No se encontraron coordenadas para: ${trimmed}`);
  }

  const latitude = Number.parseFloat(hit.lat);
  const longitude = Number.parseFloat(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Coordenadas inválidas para: ${trimmed}`);
  }

  const result: GeocodeResult = {
    latitude,
    longitude,
    placeId: String(hit.place_id ?? key),
    displayName: hit.display_name ?? trimmed,
  };

  geocodeCache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return result;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  await waitForRateLimit();

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { display_name?: string };
  return data.display_name ?? null;
}
