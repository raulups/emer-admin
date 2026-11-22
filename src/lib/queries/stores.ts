import "server-only";

import type { QueryResult } from "@/lib/queries/brands";
import { getSupabase } from "@/lib/supabase";
import { TABLES, type Uuid } from "@/types/db";
import type { StoreRow } from "@/types/stores";

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Error desconocido al leer de Supabase";
}

const COLUMNS =
  "id, brand_id, name, address, city, country, latitude, longitude, place_id, is_active, source, created_at, brand:brands(id, name)";

interface RawStore {
  id: Uuid;
  brand_id: Uuid;
  name: string | null;
  address: string;
  city: string;
  country: string | null;
  latitude: number;
  longitude: number;
  place_id: string | null;
  is_active: boolean | null;
  source: string | null;
  created_at: string | null;
  brand: { id: Uuid; name: string } | null;
}

function toRow(raw: RawStore): StoreRow {
  return {
    id: raw.id,
    brandId: raw.brand_id,
    brandName: raw.brand?.name ?? "(marca desconocida)",
    name: raw.name,
    address: raw.address,
    city: raw.city,
    country: raw.country,
    latitude: raw.latitude,
    longitude: raw.longitude,
    placeId: raw.place_id,
    isActive: raw.is_active !== false,
    source: raw.source ?? "manual",
    createdAt: raw.created_at,
  };
}

/** Todas las tiendas (son pocas: no hace falta paginar), o solo las de una marca. */
export async function getStores(brandId?: Uuid): Promise<QueryResult<StoreRow[]>> {
  try {
    let query = getSupabase()
      .from(TABLES.storeLocations)
      .select(COLUMNS)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(1000);
    if (brandId) query = query.eq("brand_id", brandId);

    const { data, error } = await query;
    if (error) return { ok: false, error: toMessage(error) };

    const rows = ((data ?? []) as unknown as RawStore[]).map(toRow);
    rows.sort(
      (a, b) =>
        a.brandName.localeCompare(b.brandName, "es") ||
        a.city.localeCompare(b.city, "es") ||
        a.address.localeCompare(b.address, "es"),
    );
    return { ok: true, data: rows };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
