import { NONE_VALUE, PRODUCT_SORTS, type ProductFilters, type ProductSort } from "@/types/products";
import { GENDERS } from "@/types/db";

/**
 * Traduccion entre los searchParams de la URL y los filtros del listado.
 * Se usa en el servidor (para consultar) y en el cliente (para navegar), asi
 * que este modulo no importa nada de servidor.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function parseBool(value: string | null): boolean | null {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lee los searchParams y devuelve filtros normalizados (nunca lanza). */
export function parseProductFilters(params: RawSearchParams): ProductFilters {
  const brandRaw = first(params.brand);
  const categoryRaw = first(params.category);
  const genderRaw = first(params.gender);
  const sortRaw = first(params.sort);
  const pageRaw = Number(first(params.page) ?? "1");

  const sort: ProductSort = PRODUCT_SORTS.includes(sortRaw as ProductSort)
    ? (sortRaw as ProductSort)
    : "last_seen";

  const gender =
    genderRaw === NONE_VALUE
      ? NONE_VALUE
      : GENDERS.includes(genderRaw as (typeof GENDERS)[number])
        ? genderRaw
        : null;

  return {
    brand: brandRaw && UUID.test(brandRaw) ? brandRaw : null,
    category:
      categoryRaw === NONE_VALUE
        ? NONE_VALUE
        : categoryRaw && UUID.test(categoryRaw)
          ? categoryRaw
          : null,
    gender,
    available: parseBool(first(params.available)),
    onSale: parseBool(first(params.on_sale)),
    q: first(params.q) ?? "",
    sort,
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
  };
}

/** Clave de searchParam de cada filtro. */
export type FilterKey = "brand" | "category" | "gender" | "available" | "on_sale" | "q" | "sort";

/**
 * Construye el query string a partir de unos filtros, aplicando cambios.
 * Un valor `null` o `""` quita el parametro. Cualquier cambio que no sea de
 * pagina vuelve a la pagina 1.
 */
export function buildProductsQuery(
  filters: ProductFilters,
  changes: Partial<Record<FilterKey | "page", string | null>> = {},
): string {
  const params = new URLSearchParams();

  const current: Record<FilterKey | "page", string | null> = {
    brand: filters.brand,
    category: filters.category,
    gender: filters.gender,
    available: filters.available === null ? null : filters.available ? "1" : "0",
    on_sale: filters.onSale === null ? null : filters.onSale ? "1" : "0",
    q: filters.q.trim() === "" ? null : filters.q.trim(),
    sort: filters.sort === "last_seen" ? null : filters.sort,
    page: filters.page > 1 ? String(filters.page) : null,
  };

  const changingFilter = Object.keys(changes).some((key) => key !== "page");
  const merged = { ...current, ...changes };

  if (changingFilter && changes.page === undefined) merged.page = null;

  for (const [key, value] of Object.entries(merged)) {
    if (value !== null && value !== "") params.set(key, value);
  }

  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

/** `true` si hay algun filtro activo (sin contar el orden ni la pagina). */
export function hasActiveFilters(filters: ProductFilters): boolean {
  return (
    filters.brand !== null ||
    filters.category !== null ||
    filters.gender !== null ||
    filters.available !== null ||
    filters.onSale !== null ||
    filters.q.trim() !== ""
  );
}
