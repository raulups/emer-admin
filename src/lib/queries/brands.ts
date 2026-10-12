import "server-only";

import { getSupabase } from "@/lib/supabase";
import type {
  BrandCounts,
  BrandDetail,
  BrandLastRun,
  BrandListItem,
  DistributionItem,
} from "@/types/brands";
import type { Brand, BrandTag, Category, Gender, ScrapeRun, ScrapeStatus, Uuid } from "@/types/db";

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: string };

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Error desconocido al consultar Supabase";
}

const BRAND_COLUMNS = "id, name, url, img, logo, color, created_at, tags, founded_year, style";

/**
 * Contadores por marca en UNA consulta, desde la vista
 * `brands_with_preview_products`.
 *
 * `category_counts` es un mapa `category_id -> nº de productos` que solo
 * incluye productos YA clasificados, asi que los productos sin categoria son
 * `total_product_count - suma(category_counts)`. Comprobado contra un
 * `count(*)` exacto en las 31 marcas: cuadra en todas.
 *
 * Importante: NO usar `count()` embebido con filtros por alias
 * (`brands?select=...,x:products(count)&x.category_id=is.null`): con varios
 * alias de la misma tabla PostgREST ignora los filtros y devuelve el total en
 * todos los alias, sin dar ningun error.
 */
const BRANDS_VIEW_SELECT = `${BRAND_COLUMNS}, total_product_count, on_sale_count, category_counts`;

/** Cuantos runs se traen para deducir el ultimo de cada marca (limite de PostgREST). */
const RECENT_RUNS_LIMIT = 1000;

interface BrandViewRow extends Brand {
  total_product_count?: number | null;
  on_sale_count?: number | null;
  category_counts?: Record<string, number> | null;
}

/** Suma los productos ya clasificados de un `category_counts`. */
function sumCategoryCounts(counts: Record<string, number> | null | undefined): number {
  if (!counts) return 0;
  return Object.values(counts).reduce((total, value) => total + (Number(value) || 0), 0);
}

/** Ultimo run de cada marca, a partir de los runs mas recientes. */
async function getLastRunByBrand(): Promise<Map<Uuid, BrandLastRun>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("scrape_runs")
    .select("brand_id, status, started_at, finished_at")
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(RECENT_RUNS_LIMIT);

  const map = new Map<Uuid, BrandLastRun>();
  if (error || !data) return map;

  // Los runs vienen del mas reciente al mas antiguo: el primero de cada marca gana.
  for (const row of data as Array<{
    brand_id: Uuid | null;
    status: ScrapeStatus;
    started_at: string | null;
    finished_at: string | null;
  }>) {
    if (!row.brand_id || map.has(row.brand_id)) continue;
    map.set(row.brand_id, {
      status: row.status,
      started_at: row.started_at,
      finished_at: row.finished_at,
    });
  }

  return map;
}

/**
 * Listado completo de marcas con contadores y ultimo scrape.
 * La busqueda, el filtro y el orden se hacen en el cliente: son pocas marcas
 * y asi la interaccion es instantanea.
 */
export async function getBrandsList(): Promise<
  QueryResult<{ brands: BrandListItem[]; countsAvailable: boolean }>
> {
  try {
    const supabase = getSupabase();

    const [view, lastRunByBrand] = await Promise.all([
      supabase
        .from("brands_with_preview_products")
        .select(BRANDS_VIEW_SELECT)
        .order("name", { ascending: true }),
      getLastRunByBrand(),
    ]);

    let rows: BrandViewRow[];
    let countsAvailable = true;

    if (view.error) {
      // Si la vista no esta disponible, al menos mostramos las marcas.
      const plain = await supabase
        .from("brands")
        .select(BRAND_COLUMNS)
        .order("name", { ascending: true });

      if (plain.error) return { ok: false, error: toMessage(view.error) };

      rows = (plain.data ?? []) as unknown as BrandViewRow[];
      countsAvailable = false;
    } else {
      rows = (view.data ?? []) as unknown as BrandViewRow[];
    }

    const brands: BrandListItem[] = rows.map((row) => {
      const total = Number(row.total_product_count ?? 0);
      const classified = sumCategoryCounts(row.category_counts);

      return {
        id: row.id,
        name: row.name,
        url: row.url,
        img: row.img,
        logo: row.logo,
        color: row.color,
        created_at: row.created_at,
        tags: row.tags ?? [],
        founded_year: row.founded_year,
        style: row.style,
        productsCount: countsAvailable ? total : null,
        unclassifiedCount: countsAvailable ? Math.max(total - classified, 0) : null,
        onSaleCount: countsAvailable ? Number(row.on_sale_count ?? 0) : null,
        lastRun: lastRunByBrand.get(row.id) ?? null,
      };
    });

    return { ok: true, data: { brands, countsAvailable } };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Una marca por id. `null` si no existe. */
export async function getBrandById(id: Uuid): Promise<QueryResult<Brand | null>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("brands")
      .select(BRAND_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) return { ok: false, error: toMessage(error) };
    if (!data) return { ok: true, data: null };

    const row = data as Brand;
    return { ok: true, data: { ...row, tags: row.tags ?? [] } };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** `id`, `name` y `url` de todas las marcas. Se usa para detectar duplicados. */
export async function getBrandsUrlIndex(): Promise<
  QueryResult<Array<Pick<Brand, "id" | "name" | "url">>>
> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("brands").select("id, name, url");

    if (error) return { ok: false, error: toMessage(error) };
    return { ok: true, data: (data ?? []) as unknown as Array<Pick<Brand, "id" | "name" | "url">> };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

const GENDER_LABELS: Record<Gender, string> = {
  men: "Hombre",
  women: "Mujer",
  unisex: "Unisex",
};

/** Detalle de una marca: resumen, repartos y ultimos runs. */
export async function getBrandDetail(id: Uuid): Promise<QueryResult<BrandDetail | null>> {
  try {
    const supabase = getSupabase();

    const brandResult = await getBrandById(id);
    if (!brandResult.ok) return brandResult;
    if (!brandResult.data) return { ok: true, data: null };
    const brand = brandResult.data;

    // Los contadores del resumen se piden con `count(*)` exacto: son el dato
    // de referencia y no dependen de la vista.
    const countOf = () => supabase.from("products").select("id", { count: "exact", head: true });

    const [total, available, onSale, unclassified, viewRow, categories, runs, ...genders] =
      await Promise.all([
        countOf().eq("brand_id", id),
        countOf().eq("brand_id", id).eq("available", true),
        countOf().eq("brand_id", id).eq("is_on_sale", true),
        countOf().eq("brand_id", id).is("category_id", null),
        supabase
          .from("brands_with_preview_products")
          .select("id, category_counts")
          .eq("id", id)
          .maybeSingle(),
        supabase.from("categories").select("id, name"),
        supabase
          .from("scrape_runs")
          .select(
            "id, brand_id, started_at, finished_at, status, products_found, products_upserted, error_message",
          )
          .eq("brand_id", id)
          .order("started_at", { ascending: false, nullsFirst: false })
          .limit(10),
        countOf().eq("brand_id", id).eq("gender", "men"),
        countOf().eq("brand_id", id).eq("gender", "women"),
        countOf().eq("brand_id", id).eq("gender", "unisex"),
        countOf().eq("brand_id", id).is("gender", null),
      ]);

    const hardError = total.error ?? available.error ?? onSale.error ?? unclassified.error;
    if (hardError) return { ok: false, error: toMessage(hardError) };

    const counts: BrandCounts = {
      total: total.count ?? 0,
      available: available.count ?? 0,
      onSale: onSale.count ?? 0,
      unclassified: unclassified.count ?? 0,
    };

    let warning: string | null = null;

    // Reparto por categoria: `category_counts` de la vista + nombres de `categories`.
    let byCategory: DistributionItem[] = [];
    const categoryError = viewRow.error ?? categories.error;

    if (categoryError) {
      warning = `No se ha podido calcular el reparto por categoría: ${toMessage(categoryError)}`;
    } else {
      const names = new Map<Uuid, string>(
        ((categories.data ?? []) as unknown as Array<Pick<Category, "id" | "name">>).map(
          (category) => [category.id, category.name] as const,
        ),
      );

      const rawCounts =
        (viewRow.data as { category_counts?: Record<string, number> | null } | null)
          ?.category_counts ?? {};

      byCategory = Object.entries(rawCounts)
        .map(([categoryId, count]) => ({
          label: names.get(categoryId) ?? "Categoría desconocida",
          count: Number(count) || 0,
        }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count);

      if (counts.unclassified > 0) {
        byCategory.push({ label: "Sin categoría", count: counts.unclassified });
      }
    }

    // Reparto por genero: men, women, unisex y sin genero, en ese orden.
    const genderOrder: Array<Gender | null> = ["men", "women", "unisex", null];
    const byGender: DistributionItem[] = genderOrder
      .map((gender, index) => ({
        label: gender ? GENDER_LABELS[gender] : "Sin género",
        count: genders[index]?.count ?? 0,
      }))
      .filter((item) => item.count > 0);

    if (runs.error && !warning) {
      warning = `No se ha podido cargar el historial de scrapes: ${toMessage(runs.error)}`;
    }

    return {
      ok: true,
      data: {
        brand,
        counts,
        byCategory,
        byGender,
        runs: (runs.data ?? []) as unknown as ScrapeRun[],
        warning,
      },
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Tags presentes en el catalogo, para el filtro del listado. */
export function collectTags(brands: BrandListItem[]): BrandTag[] {
  const seen = new Set<BrandTag>();
  for (const brand of brands) {
    for (const tag of brand.tags) seen.add(tag);
  }
  return [...seen];
}
