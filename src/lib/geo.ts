/**
 * Utilidades de coordenadas y enlaces de mapas para las tiendas fisicas.
 * Puro: se usa en el cliente (formulario) y en el servidor (acciones).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ParsedLocation {
  coords: LatLng | null;
  placeId: string | null;
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function toCoords(lat: string | undefined, lng: string | undefined): LatLng | null {
  if (lat === undefined || lng === undefined) return null;
  const a = Number(lat);
  const b = Number(lng);
  return isValidLatLng(a, b) ? { lat: a, lng: b } : null;
}

const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";
const PAIR = new RegExp(`^\\s*${NUM}\\s*[,;\\s]\\s*${NUM}\\s*$`);
/** Pin exacto del sitio en los enlaces de Google Maps: `!3d<lat>!4d<lng>`. */
const PIN = new RegExp(`!3d${NUM}!4d${NUM}`);
/** Centro de la vista: `@<lat>,<lng>,17z`. */
const VIEW = new RegExp(`@${NUM},${NUM}`);
const PLACE_ID = /(?:query_place_id=|place_id[:=]|!1s)(ChI[A-Za-z0-9_-]{10,})/;

/**
 * Lee coordenadas (y place_id si viene) de lo que se pegue: "40.42, -3.69", un enlace de
 * Google Maps (pin, vista, `q=`, `query=`, `ll=`) o de OpenStreetMap (`mlat`/`mlon`, `#map=`).
 */
export function parseLocationInput(input: string): ParsedLocation {
  const text = input.trim();
  if (text === "") return { coords: null, placeId: null };

  const pair = PAIR.exec(text);
  if (pair) return { coords: toCoords(pair[1], pair[2]), placeId: null };

  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    // Enlace mal codificado: se usa tal cual.
  }

  const placeId = PLACE_ID.exec(decoded)?.[1] ?? null;

  const pin = PIN.exec(decoded);
  if (pin) return { coords: toCoords(pin[1], pin[2]), placeId };

  try {
    const url = new URL(decoded);
    for (const key of ["q", "query", "ll", "center", "destination"]) {
      const value = url.searchParams.get(key);
      const match = value ? PAIR.exec(value) : null;
      if (match) return { coords: toCoords(match[1], match[2]), placeId };
    }
    const mlat = url.searchParams.get("mlat") ?? undefined;
    const mlon = url.searchParams.get("mlon") ?? undefined;
    if (mlat && mlon) return { coords: toCoords(mlat, mlon), placeId };
    const osm = /map=\d+\/(-?[\d.]+)\/(-?[\d.]+)/.exec(url.hash);
    if (osm) return { coords: toCoords(osm[1], osm[2]), placeId };
  } catch {
    // No es una URL: puede seguir teniendo una vista "@lat,lng".
  }

  const view = VIEW.exec(decoded);
  if (view) return { coords: toCoords(view[1], view[2]), placeId };

  return { coords: null, placeId };
}

/** Enlaces cortos de Google Maps: hay que seguir la redireccion (en el servidor) para leerlos. */
export function isShortMapsLink(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return (
      url.hostname === "maps.app.goo.gl" ||
      (url.hostname === "goo.gl" && url.pathname.startsWith("/maps"))
    );
  } catch {
    return false;
  }
}

/** Abre la tienda en Google Maps (con el place_id si lo hay, que lleva a la ficha). */
export function googleMapsUrl(lat: number, lng: number, placeId?: string | null): string {
  const params = new URLSearchParams({ api: "1", query: `${lat},${lng}` });
  if (placeId) params.set("query_place_id", placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/** Mapa embebido de OpenStreetMap con un marcador (no necesita clave). */
export function osmEmbedUrl(lat: number, lng: number, span = 0.004): string {
  const bbox = [lng - span, lat - span / 2, lng + span, lat + span / 2]
    .map((n) => n.toFixed(6))
    .join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Un place_id de Google empieza por "ChIJ" (casi siempre) y es una cadena base64url larga.
 * Detecta los inventados a mano (patrones repetidos como "_8_8_8" o colas solo de digitos).
 * No sustituye a comprobarlo contra Google.
 */
export function looksLikeFakePlaceId(placeId: string): boolean {
  const id = placeId.trim();
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) return true;
  if (/(.{2,4})\1{2,}/.test(id)) return true;
  if ((id.match(/_/g)?.length ?? 0) >= 4) return true;
  if (/\d{12,}$/.test(id)) return true;
  return false;
}

/** Distancia en metros (haversine), para avisar de tiendas duplicadas. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
