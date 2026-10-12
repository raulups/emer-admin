import "server-only";

import type { QueryResult } from "@/lib/queries/brands";
import { getSupabase } from "@/lib/supabase";
import type { Brand, Category, Uuid } from "@/types/db";
import {
  GROUPING_ROW_LIMIT,
  type MappingRow,
  type ReviewGroup,
  type RuleRow,
  type UnclassifiedGroup,
} from "@/types/classification";
import type { ClassifyMapping, ClassifyRule } from "@/lib/classify";

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Error desconocido al consultar Supabase";
}

/** Tamaño de pagina de PostgREST. */
const PAGE_SIZE = 1000;

interface ProductGroupRow {
  id: Uuid;
  name: string | null;
  brand_id: Uuid;
  product_type: string | null;
  category_id?: Uuid | null;
}

/** Lo que devuelve PostgREST en cada pagina. */
type PageResult = { data: unknown; error: { message?: string } | null };

/**
 * Pide paginas hasta agotar los resultados o llegar al tope.
 *
 * Quien construya la consulta DEBE ordenar por una columna estable (`id`):
 * sin orden, `range()` devuelve filas repetidas y se salta otras — medido
 * contra la base real.
 */
async function paginate(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult>,
): Promise<{ rows: ProductGroupRow[]; truncated: boolean; error?: string }> {
  const rows: ProductGroupRow[] = [];

  for (let from = 0; from < GROUPING_ROW_LIMIT; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);

    if (error) return { rows, truncated: false, error: toMessage(error) };

    const page = (data ?? []) as unknown as ProductGroupRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) return { rows, truncated: false };
  }

  return { rows, truncated: true };
}

/* ------------------------------------------------------------------ */
/* Pestaña 1: sin categoria                                            */
/* ------------------------------------------------------------------ */

/** Productos sin categoria agrupados por marca y `product_type`. */
export async function getUnclassifiedGroups(): Promise<
  QueryResult<{ groups: UnclassifiedGroup[]; total: number; truncated: boolean }>
> {
  try {
    const supabase = getSupabase();

    const [products, brandsResult] = await Promise.all([
      paginate((from, to) =>
        supabase
          .from("products")
          .select("id, name, brand_id, product_type")
          .is("category_id", null)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      supabase.from("brands").select("id, name"),
    ]);

    if (products.error) return { ok: false, error: products.error };
    if (brandsResult.error) return { ok: false, error: toMessage(brandsResult.error) };

    const brandNames = new Map(
      ((brandsResult.data ?? []) as unknown as Array<Pick<Brand, "id" | "name">>).map((brand) => [
        brand.id,
        brand.name,
      ]),
    );

    const groups = new Map<string, UnclassifiedGroup>();

    for (const row of products.rows) {
      const productType = row.product_type?.trim() ?? "";
      const productTypeKey = productType.toLowerCase();
      const key = `${row.brand_id}|${productTypeKey}`;

      let group = groups.get(key);
      if (!group) {
        group = {
          brandId: row.brand_id,
          brandName: brandNames.get(row.brand_id) ?? "(marca desconocida)",
          productType,
          productTypeKey,
          count: 0,
          samples: [],
        };
        groups.set(key, group);
      }

      group.count += 1;
      if (group.samples.length < 3) group.samples.push({ id: row.id, name: row.name });
    }

    const sorted = [...groups.values()].sort(
      (a, b) => b.count - a.count || a.brandName.localeCompare(b.brandName, "es"),
    );

    return {
      ok: true,
      data: { groups: sorted, total: products.rows.length, truncated: products.truncated },
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/* ------------------------------------------------------------------ */
/* Pestaña 2: revision                                                 */
/* ------------------------------------------------------------------ */

/**
 * Agregado marca × product_type × categoria de UNA marca.
 *
 * Es por marca a proposito: agregar las 12.000 filas clasificadas de golpe
 * son 13 peticiones a PostgREST (~12 s), porque no admite `GROUP BY`. Marca a
 * marca es una o dos peticiones.
 */
export async function getReviewGroups(
  brandId: Uuid,
): Promise<QueryResult<{ groups: ReviewGroup[]; truncated: boolean }>> {
  try {
    const supabase = getSupabase();

    const [products, brandResult, categoriesResult] = await Promise.all([
      paginate((from, to) =>
        supabase
          .from("products")
          .select("id, name, brand_id, product_type, category_id")
          .eq("brand_id", brandId)
          .not("category_id", "is", null)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      supabase.from("brands").select("id, name").eq("id", brandId).maybeSingle(),
      supabase.from("categories").select("id, name"),
    ]);

    if (products.error) return { ok: false, error: products.error };

    const brandName = (brandResult.data as Pick<Brand, "id" | "name"> | null)?.name ?? "";
    const categoryNames = new Map(
      ((categoriesResult.data ?? []) as unknown as Array<Pick<Category, "id" | "name">>).map(
        (category) => [category.id, category.name],
      ),
    );

    const groups = new Map<string, ReviewGroup>();

    for (const row of products.rows) {
      const productType = row.product_type?.trim() ?? "";
      const categoryId = row.category_id ?? null;
      const key = `${productType.toLowerCase()}|${categoryId ?? "null"}`;

      let group = groups.get(key);
      if (!group) {
        group = {
          brandId,
          brandName,
          productType,
          categoryId,
          categoryName: categoryId ? (categoryNames.get(categoryId) ?? null) : null,
          count: 0,
          sample: null,
        };
        groups.set(key, group);
      }

      group.count += 1;
      if (!group.sample) group.sample = { id: row.id, name: row.name };
    }

    const sorted = [...groups.values()].sort(
      (a, b) => a.productType.localeCompare(b.productType, "es") || b.count - a.count,
    );

    return { ok: true, data: { groups: sorted, truncated: products.truncated } };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/* ------------------------------------------------------------------ */
/* Pestaña 3: reglas                                                   */
/* ------------------------------------------------------------------ */

/** Reglas ordenadas por prioridad descendente y luego por keyword. */
export async function getRules(): Promise<QueryResult<RuleRow[]>> {
  try {
    const supabase = getSupabase();

    const [rulesResult, categoriesResult] = await Promise.all([
      supabase
        .from("category_keyword_rules")
        .select("id, keyword, category_id, priority, created_at")
        .order("priority", { ascending: false })
        .order("keyword", { ascending: true })
        .limit(2000),
      supabase.from("categories").select("id, name"),
    ]);

    if (rulesResult.error) return { ok: false, error: toMessage(rulesResult.error) };

    const categoryNames = new Map(
      ((categoriesResult.data ?? []) as unknown as Array<Pick<Category, "id" | "name">>).map(
        (category) => [category.id, category.name],
      ),
    );

    const rows = (rulesResult.data ?? []) as unknown as Array<{
      id: Uuid;
      keyword: string;
      category_id: Uuid | null;
      priority: number | null;
      created_at: string | null;
    }>;

    return {
      ok: true,
      data: rows.map((row) => ({
        id: row.id,
        keyword: row.keyword,
        categoryId: row.category_id,
        categoryName: row.category_id ? (categoryNames.get(row.category_id) ?? null) : null,
        priority: row.priority ?? 0,
        createdAt: row.created_at,
      })),
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Reglas en el formato que espera `classifyProduct` (para el probador). */
export async function getClassifyRules(): Promise<QueryResult<ClassifyRule[]>> {
  const result = await getRules();
  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data
      .filter((rule): rule is RuleRow & { categoryId: Uuid } => rule.categoryId !== null)
      .map((rule) => ({
        keyword: rule.keyword,
        categoryId: rule.categoryId,
        priority: rule.priority,
      })),
  };
}

/* ------------------------------------------------------------------ */
/* Pestaña 4: mapeos                                                   */
/* ------------------------------------------------------------------ */

/** Mapeos con marca, categoria y productos que los usan ahora mismo. */
export async function getMappings(): Promise<QueryResult<MappingRow[]>> {
  try {
    const supabase = getSupabase();

    const [mappingsResult, brandsResult, categoriesResult] = await Promise.all([
      supabase
        .from("shop_category_mappings")
        .select("id, brand_id, external_category_name, category_id")
        .order("external_category_name", { ascending: true })
        .limit(2000),
      supabase.from("brands").select("id, name"),
      supabase.from("categories").select("id, name"),
    ]);

    if (mappingsResult.error) return { ok: false, error: toMessage(mappingsResult.error) };

    const brandNames = new Map(
      ((brandsResult.data ?? []) as unknown as Array<Pick<Brand, "id" | "name">>).map((brand) => [
        brand.id,
        brand.name,
      ]),
    );
    const categoryNames = new Map(
      ((categoriesResult.data ?? []) as unknown as Array<Pick<Category, "id" | "name">>).map(
        (category) => [category.id, category.name],
      ),
    );

    const rows = (mappingsResult.data ?? []) as unknown as Array<{
      id: Uuid;
      brand_id: Uuid;
      external_category_name: string;
      category_id: Uuid | null;
    }>;

    // Cuantos productos usan cada mapeo: `ilike` sin comodines compara sin
    // distinguir mayusculas, que es como lo hace el scraper.
    const counts = await Promise.all(
      rows.map((row) =>
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("brand_id", row.brand_id)
          .ilike("product_type", row.external_category_name),
      ),
    );

    return {
      ok: true,
      data: rows.map((row, index) => ({
        id: row.id,
        brandId: row.brand_id,
        brandName: brandNames.get(row.brand_id) ?? null,
        externalCategoryName: row.external_category_name,
        categoryId: row.category_id,
        categoryName: row.category_id ? (categoryNames.get(row.category_id) ?? null) : null,
        productsCount: counts[index]?.count ?? 0,
      })),
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Mapeos en el formato que espera `classifyProduct`. */
export async function getClassifyMappings(): Promise<QueryResult<ClassifyMapping[]>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("shop_category_mappings")
      .select("brand_id, external_category_name, category_id")
      .limit(2000);

    if (error) return { ok: false, error: toMessage(error) };

    const rows = (data ?? []) as unknown as Array<{
      brand_id: Uuid;
      external_category_name: string;
      category_id: Uuid | null;
    }>;

    return {
      ok: true,
      data: rows
        .filter((row): row is typeof row & { category_id: Uuid } => row.category_id !== null)
        .map((row) => ({
          brandId: row.brand_id,
          externalCategoryName: row.external_category_name,
          categoryId: row.category_id,
        })),
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
