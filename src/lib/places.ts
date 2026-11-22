import "server-only";

import { getEnv } from "@/lib/env";
import { isShortMapsLink, parseLocationInput, type ParsedLocation } from "@/lib/geo";

/** Un resultado del buscador de tiendas, listo para rellenar el formulario. */
export interface PlaceCandidate {
  name: string | null;
  address: string;
  city: string;
  country: string | null;
  latitude: number;
  longitude: number;
  placeId: string | null;
  source: "google" | "osm";
  /** Texto completo para enseñarlo en la lista. */
  label: string;
}

export type PlaceSearchResult =
  | { ok: true; provider: "google" | "osm"; results: PlaceCandidate[] }
  | { ok: false; error: string };

const TIMEOUT_MS = 8000;
const MAX_RESULTS = 6;

export function hasGooglePlacesKey(): boolean {
  try {
    return Boolean(getEnv().GOOGLE_PLACES_API_KEY);
  } catch {
    return false;
  }
}

/** Busca con Google Places si hay clave; si no, con OpenStreetMap (Nominatim). */
export async function searchPlaces(query: string): Promise<PlaceSearchResult> {
  const key = getEnv().GOOGLE_PLACES_API_KEY;
  try {
    if (key) return { ok: true, provider: "google", results: await searchGoogle(query, key) };
    return { ok: true, provider: "osm", results: await searchNominatim(query) };
  } catch (error) {
    const provider = key ? "Google Places" : "OpenStreetMap";
    if (error instanceof Error && error.name === "TimeoutError") {
      return { ok: false, error: `${provider} no ha respondido a tiempo.` };
    }
    return {
      ok: false,
      error: `${provider}: ${error instanceof Error ? error.message : "error desconocido"}`,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Google Places (API nueva)                                           */
/* ------------------------------------------------------------------ */

interface GoogleComponent {
  longText?: string;
  types?: string[];
}

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  addressComponents?: GoogleComponent[];
}

const GOOGLE_FIELDS =
  "places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents";

function component(place: GooglePlace, type: string): string | null {
  return place.addressComponents?.find((c) => c.types?.includes(type))?.longText ?? null;
}

async function searchGoogle(query: string, key: string): Promise<PlaceCandidate[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": GOOGLE_FIELDS,
    },
    body: JSON.stringify({ textQuery: query, languageCode: "es", regionCode: "ES" }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
  }
  const data = (await response.json()) as { places?: GooglePlace[] };

  return (data.places ?? []).slice(0, MAX_RESULTS).flatMap((place): PlaceCandidate[] => {
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    if (lat === undefined || lng === undefined) return [];
    const route = component(place, "route");
    const number = component(place, "street_number");
    const street = [route, number].filter(Boolean).join(", ");
    const city =
      component(place, "locality") ??
      component(place, "postal_town") ??
      component(place, "administrative_area_level_2") ??
      "";
    return [
      {
        name: place.displayName?.text ?? null,
        address: street || place.formattedAddress?.split(",")[0]?.trim() || "",
        city,
        country: component(place, "country"),
        latitude: lat,
        longitude: lng,
        placeId: place.id ?? null,
        source: "google",
        label: [place.displayName?.text, place.formattedAddress].filter(Boolean).join(" · "),
      },
    ];
  });
}

/** Comprueba que un place_id existe en Google (solo pide el id: es la llamada mas barata). */
export async function verifyGooglePlaceId(
  placeId: string,
): Promise<{ ok: true; exists: boolean } | { ok: false; error: string }> {
  const key = getEnv().GOOGLE_PLACES_API_KEY;
  if (!key) return { ok: false, error: "Falta GOOGLE_PLACES_API_KEY en .env.local." };
  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "id" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      },
    );
    if (response.ok) return { ok: true, exists: true };
    if (response.status === 400 || response.status === 404) return { ok: true, exists: false };
    return { ok: false, error: `Google respondió ${response.status}.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

/* ------------------------------------------------------------------ */
/* OpenStreetMap (Nominatim)                                           */
/* ------------------------------------------------------------------ */

interface NominatimPlace {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string | undefined>;
}

async function searchNominatim(query: string): Promise<PlaceCandidate[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: String(MAX_RESULTS),
    "accept-language": "es",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    // La politica de uso de Nominatim pide identificar la aplicacion.
    headers: { "User-Agent": "emer-admin/1.0 (panel local de Emer)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = (await response.json()) as NominatimPlace[];

  return data.flatMap((place): PlaceCandidate[] => {
    const lat = Number(place.lat);
    const lng = Number(place.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const a = place.address ?? {};
    const street = [a.road ?? a.pedestrian ?? a.footway, a.house_number].filter(Boolean).join(", ");
    const shop = a.shop ?? a.clothes ?? place.name ?? null;
    return [
      {
        name: shop && shop !== street ? shop : null,
        address: street || place.display_name.split(",")[0]?.trim() || "",
        city: a.city ?? a.town ?? a.village ?? a.municipality ?? "",
        country: a.country ?? null,
        latitude: lat,
        longitude: lng,
        placeId: null,
        source: "osm",
        label: place.display_name,
      },
    ];
  });
}

/* ------------------------------------------------------------------ */
/* Enlaces cortos                                                      */
/* ------------------------------------------------------------------ */

/**
 * Lee un enlace de mapas; si es corto (maps.app.goo.gl) sigue las redirecciones en el servidor
 * hasta la URL larga, que es la que lleva las coordenadas.
 */
export async function resolveMapsLink(input: string): Promise<ParsedLocation> {
  if (!isShortMapsLink(input)) return parseLocationInput(input);

  let url = input.trim();
  for (let hop = 0; hop < 5; hop++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const next = response.headers.get("location");
    if (!next) break;
    url = new URL(next, url).toString();
    const parsed = parseLocationInput(url);
    if (parsed.coords) return parsed;
  }
  return parseLocationInput(url);
}
