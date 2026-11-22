"use server";

// Un fichero "use server" solo puede exportar funciones async: los esquemas viven en
// src/lib/validation/store.ts y aqui solo se importan.

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { distanceMeters, type ParsedLocation } from "@/lib/geo";
import {
  hasGooglePlacesKey,
  resolveMapsLink,
  searchPlaces,
  verifyGooglePlaceId,
  type PlaceSearchResult,
} from "@/lib/places";
import { getSupabase } from "@/lib/supabase";
import { storeFormSchema, type StoreFormInput } from "@/lib/validation/store";
import { TABLES, type Uuid } from "@/types/db";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

export type StoreSaveResult =
  | { ok: true; message: string; id: Uuid; warning?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Error desconocido al guardar en Supabase";
}

/** Metros por debajo de los cuales dos tiendas de la misma marca parecen la misma. */
const DUPLICATE_METERS = 40;

function revalidate(brandId?: Uuid) {
  revalidatePath("/stores");
  if (brandId) revalidatePath(`/brands/${brandId}`);
}

function parseForm(input: StoreFormInput) {
  const parsed = storeFormSchema.safeParse(input);
  if (parsed.success) return { ok: true as const, data: parsed.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return {
    ok: false as const,
    error: parsed.error.issues[0]?.message ?? "Revisa el formulario.",
    fieldErrors,
  };
}

/** Otra tienda de la misma marca a pocos metros: se guarda igual, pero se avisa. */
async function nearbyWarning(
  brandId: Uuid,
  lat: number,
  lng: number,
  exceptId?: Uuid,
): Promise<string | undefined> {
  const { data } = await getSupabase()
    .from(TABLES.storeLocations)
    .select("id, address, latitude, longitude")
    .eq("brand_id", brandId);
  const near = (
    (data ?? []) as Array<{
      id: Uuid;
      address: string;
      latitude: number;
      longitude: number;
    }>
  ).find(
    (store) =>
      store.id !== exceptId &&
      distanceMeters({ lat, lng }, { lat: store.latitude, lng: store.longitude }) <
        DUPLICATE_METERS,
  );
  return near
    ? `Ojo: esta marca ya tiene una tienda a menos de ${DUPLICATE_METERS} m (${near.address}).`
    : undefined;
}

function toColumns(values: ReturnType<typeof storeFormSchema.parse>) {
  return {
    brand_id: values.brandId,
    name: values.name,
    address: values.address,
    city: values.city,
    country: values.country,
    latitude: values.latitude,
    longitude: values.longitude,
    place_id: values.placeId,
    is_active: values.isActive,
    source: values.source,
  };
}

export async function createStore(input: StoreFormInput): Promise<StoreSaveResult> {
  const parsed = parseForm(input);
  if (!parsed.ok) return parsed;
  const values = parsed.data;

  try {
    const warning = await nearbyWarning(values.brandId, values.latitude, values.longitude);
    const { data, error } = await getSupabase()
      .from(TABLES.storeLocations)
      .insert(toColumns(values))
      .select("id")
      .single();
    if (error) return { ok: false, error: toMessage(error) };

    revalidate(values.brandId);
    return { ok: true, message: "Tienda creada.", id: (data as { id: Uuid }).id, warning };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function updateStore(id: Uuid, input: StoreFormInput): Promise<StoreSaveResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Tienda no válida." };
  const parsed = parseForm(input);
  if (!parsed.ok) return parsed;
  const values = parsed.data;

  try {
    const supabase = getSupabase();
    const { data: previous } = await supabase
      .from(TABLES.storeLocations)
      .select("brand_id")
      .eq("id", id)
      .maybeSingle();

    const warning = await nearbyWarning(values.brandId, values.latitude, values.longitude, id);
    const { error } = await supabase
      .from(TABLES.storeLocations)
      .update(toColumns(values))
      .eq("id", id);
    if (error) return { ok: false, error: toMessage(error) };

    revalidate(values.brandId);
    const previousBrand = (previous as { brand_id?: Uuid } | null)?.brand_id;
    if (previousBrand && previousBrand !== values.brandId) revalidate(previousBrand);
    return { ok: true, message: "Tienda guardada.", id, warning };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Activa u oculta una tienda: la app y la web solo enseñan las activas. */
export async function setStoreActive(id: Uuid, active: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Tienda no válida." };
  try {
    const { data, error } = await getSupabase()
      .from(TABLES.storeLocations)
      .update({ is_active: active })
      .eq("id", id)
      .select("brand_id")
      .maybeSingle();
    if (error) return { ok: false, error: toMessage(error) };

    revalidate((data as { brand_id?: Uuid } | null)?.brand_id);
    return { ok: true, message: active ? "Tienda activada." : "Tienda oculta en la app." };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function deleteStore(id: Uuid): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Tienda no válida." };
  try {
    const { data, error } = await getSupabase()
      .from(TABLES.storeLocations)
      .delete()
      .eq("id", id)
      .select("brand_id")
      .maybeSingle();
    if (error) return { ok: false, error: toMessage(error) };

    revalidate((data as { brand_id?: Uuid } | null)?.brand_id);
    return { ok: true, message: "Tienda borrada." };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Buscador del formulario: nombre de la tienda, direccion o las dos cosas. */
export async function searchStorePlaces(query: string): Promise<PlaceSearchResult> {
  const text = z.string().trim().min(3).max(200).safeParse(query);
  if (!text.success) return { ok: false, error: "Escribe al menos 3 caracteres." };
  return searchPlaces(text.data);
}

/** Coordenadas (y place_id) de un enlace de mapas, incluidos los cortos de maps.app.goo.gl. */
export async function resolveLocationLink(
  input: string,
): Promise<{ ok: true; location: ParsedLocation } | { ok: false; error: string }> {
  const text = z.string().trim().min(3).max(2000).safeParse(input);
  if (!text.success) return { ok: false, error: "Pega un enlace o unas coordenadas." };
  try {
    const location = await resolveMapsLink(text.data);
    if (!location.coords) {
      return { ok: false, error: "No he encontrado coordenadas en ese enlace." };
    }
    return { ok: true, location };
  } catch (error) {
    return { ok: false, error: `No se ha podido abrir el enlace: ${toMessage(error)}` };
  }
}

/** Comprueba contra Google los place_id de las tiendas (necesita GOOGLE_PLACES_API_KEY). */
export async function verifyStorePlaceIds(): Promise<
  { ok: true; invalid: Uuid[]; checked: number } | { ok: false; error: string }
> {
  if (!hasGooglePlacesKey()) {
    return { ok: false, error: "Añade GOOGLE_PLACES_API_KEY a .env.local para comprobarlos." };
  }
  try {
    const { data, error } = await getSupabase()
      .from(TABLES.storeLocations)
      .select("id, place_id")
      .not("place_id", "is", null);
    if (error) return { ok: false, error: toMessage(error) };

    const stores = (data ?? []) as Array<{ id: Uuid; place_id: string }>;
    const checks = await Promise.all(
      stores.map(async (store) => ({
        id: store.id,
        result: await verifyGooglePlaceId(store.place_id),
      })),
    );
    const failed = checks.find((check) => !check.result.ok);
    if (failed && !failed.result.ok) return { ok: false, error: failed.result.error };

    return {
      ok: true,
      checked: stores.length,
      invalid: checks
        .filter((check) => check.result.ok && !check.result.exists)
        .map((check) => check.id),
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
