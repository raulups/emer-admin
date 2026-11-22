/**
 * Importa las tiendas fisicas de data/stores-import.json a store_locations.
 *
 *   npm run import-stores            # geocodifica y guarda
 *   npm run import-stores -- --dry   # solo enseña lo que haria
 *
 * Coordenadas: con GOOGLE_PLACES_API_KEY usa Google Places (y guarda el place_id real);
 * sin ella, OpenStreetMap/Nominatim (1 peticion por segundo, sin place_id).
 * Entradas con `id`: corrigen esa tienda. Sin `id`: se crean, salvo que la marca ya tenga
 * una tienda a menos de 40 m (asi se puede ejecutar varias veces sin duplicar).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleKey = process.env.GOOGLE_PLACES_API_KEY || null;
const dry = process.argv.includes("--dry");

if (!url || !key) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Usa `npm run import-stores`.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const { stores } = JSON.parse(readFileSync(resolve("data/stores-import.json"), "utf8"));
const DUPLICATE_METERS = 40;
/** Distancia maxima aceptable entre el resultado y el centro de la ciudad pedida. */
const MAX_KM_FROM_CITY = 40;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function meters(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function nominatim(params) {
  const qs = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    "accept-language": "es",
    ...params,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, {
    headers: { "User-Agent": "emer-admin/1.0 (importacion de tiendas)" },
    signal: AbortSignal.timeout(10000),
  });
  await sleep(1100);
  if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
  const [hit] = await response.json();
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name } : null;
}

const cityCache = new Map();
async function cityCenter(store) {
  const k = `${store.city}|${store.country}`;
  if (!cityCache.has(k))
    cityCache.set(k, await nominatim({ q: `${store.city}, ${store.country}` }));
  return cityCache.get(k);
}

async function geocodeGoogle(store) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": googleKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: `${store.brand} ${store.address}, ${store.postcode ?? ""} ${store.city}`,
      languageCode: "es",
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Google HTTP ${response.status}`);
  const place = (await response.json()).places?.[0];
  if (!place?.location) return null;
  return {
    lat: place.location.latitude,
    lng: place.location.longitude,
    placeId: place.id,
    label: `${place.displayName?.text ?? ""} · ${place.formattedAddress ?? ""}`,
    source: "google",
  };
}

async function geocodeOsm(store) {
  const street = store.address.replace(/,\s*(\d+\w?)$/, " $1");
  const hit =
    (await nominatim({
      q: `${street}, ${store.postcode ?? ""} ${store.city}, ${store.country}`,
    })) ?? (await nominatim({ q: `${street}, ${store.city}` }));
  return hit ? { ...hit, placeId: null, source: "osm" } : null;
}

const { data: brands, error: brandsError } = await sb.from("brands").select("id, name");
if (brandsError) throw brandsError;
const brandId = new Map(brands.map((b) => [b.name.toLowerCase(), b.id]));

const { data: existing, error: existingError } = await sb
  .from("store_locations")
  .select("id, brand_id, latitude, longitude");
if (existingError) throw existingError;

console.log(
  `${stores.length} tiendas · geocodificando con ${googleKey ? "Google Places" : "OpenStreetMap"}${dry ? " · SIN GUARDAR (--dry)" : ""}\n`,
);

const summary = { created: 0, updated: 0, skipped: 0, failed: 0 };

for (const store of stores) {
  const tag = `${store.brand} · ${store.name} · ${store.address}, ${store.city}`;
  const brand = brandId.get(store.brand.toLowerCase());
  if (!brand) {
    console.log(`✗ ${tag}\n    marca no encontrada en la base`);
    summary.failed++;
    continue;
  }

  let geo = null;
  try {
    geo = googleKey ? await geocodeGoogle(store) : await geocodeOsm(store);
    if (!geo && googleKey) geo = await geocodeOsm(store);
  } catch (error) {
    console.log(`✗ ${tag}\n    ${error.message}`);
    summary.failed++;
    continue;
  }
  if (!geo) {
    console.log(`✗ ${tag}\n    sin resultados: añádela a mano en /stores`);
    summary.failed++;
    continue;
  }

  const center = await cityCenter(store).catch(() => null);
  if (center && meters(center, geo) > MAX_KM_FROM_CITY * 1000) {
    console.log(
      `✗ ${tag}\n    resultado a ${Math.round(meters(center, geo) / 1000)} km de ${store.city}: ${geo.label}`,
    );
    summary.failed++;
    continue;
  }

  const row = {
    brand_id: brand,
    name: store.name ?? null,
    address: store.address,
    city: store.city,
    country: store.country ?? null,
    latitude: geo.lat,
    longitude: geo.lng,
    // Google da el place_id real; si no, se respeta el de la entrada (null = quitar el que habia).
    place_id: geo.placeId ?? (store.placeId === undefined ? null : store.placeId),
    is_active: true,
    source: geo.source,
  };
  const where = `${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}${row.place_id ? ` · ${row.place_id}` : ""}`;

  if (store.id) {
    if (!dry) {
      const { error } = await sb.from("store_locations").update(row).eq("id", store.id);
      if (error) {
        console.log(`✗ ${tag}\n    ${error.message}`);
        summary.failed++;
        continue;
      }
    }
    console.log(`↻ ${tag}\n    ${where}`);
    summary.updated++;
    continue;
  }

  const near = existing.find(
    (s) =>
      s.brand_id === brand &&
      meters({ lat: s.latitude, lng: s.longitude }, geo) < DUPLICATE_METERS &&
      !stores.some((other) => other.id === s.id),
  );
  if (near) {
    console.log(`· ${tag}\n    ya existe una tienda de la marca a menos de ${DUPLICATE_METERS} m`);
    summary.skipped++;
    continue;
  }

  if (!dry) {
    const { data, error } = await sb.from("store_locations").insert(row).select("id").single();
    if (error) {
      console.log(`✗ ${tag}\n    ${error.message}`);
      summary.failed++;
      continue;
    }
    existing.push({ id: data.id, brand_id: brand, latitude: geo.lat, longitude: geo.lng });
  }
  console.log(`+ ${tag}\n    ${where}`);
  summary.created++;
}

console.log(
  `\nCreadas ${summary.created} · corregidas ${summary.updated} · ya estaban ${summary.skipped} · fallidas ${summary.failed}`,
);
if (dry) console.log("Nada guardado: quita --dry para importar.");
