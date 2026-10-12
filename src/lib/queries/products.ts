import "server-only";

import { getSupabase } from "@/lib/supabase";
import type { QueryResult } from "@/lib/queries/brands";
import type {
  ProductDetailData,
  ProductFilters,
  ProductListItem,
  ProductsPage,
} from "@/types/products";
import { NONE_VALUE, PRODUCTS_PAGE_SIZE } from "@/types/products";
import type {
  Brand,
  Category,
  Gender,
  Product,
  ProductPriceHistory,
  ProductSize,
  Uuid,
} from "@/types/db";

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Error desconocido al consultar Supabase";
}

/**
 * Columnas del listado. `product_sizes(available)` es un embed de FILAS (no un
 * `count()` agregado): ese si devuelve datos correctos. Ver el aviso de
 * PostgREST en CLAUDE.md.
 */
const LIST_SELECT = [
  "id, name, thumbnail_image_url, main_image_url, currency, current_price, original_price",
  "is_on_sale, available, gender, color_hex, color_name, product_type, category_locked, last_seen_at",
  "brand:brands(id, name)",
  "category:categories(id, name)",
  "product_sizes(available)",
].join(", ");

interface ListRow {
  id: Uuid;
  name: string | null;
  thumbnail_image_url: string | null;
  main_image_url: string | null;
  currency: string | null;
  current_price: number | null;
  original_price: number | null;
  is_on_sale: boolean | null;
  available: boolean | null;
  gender: Gender | null;
  color_hex: string | null;
  color_name: string | null;
  product_type: string | null;
  category_locked: boolean | null;
  last_seen_at: string | null;
  brand: Pick<Brand, "id" | "name"> | null;
  category: Pick<Category, "id" | "name"> | null;
  product_sizes: Array<{ available: boolean | null }> | null;
}

/** Pagina del listado con los filtros ya normalizados. */
export async function getProductsPage(filters: ProductFilters): Promise<QueryResult<ProductsPage>> {
  try {
    const supabase = getSupabase();

    let query = supabase.from("products").select(LIST_SELECT, { count: "exact" });

    if (filters.brand) query = query.eq("brand_id", filters.brand);

    if (filters.category === NONE_VALUE) query = query.is("category_id", null);
    else if (filters.category) query = query.eq("category_id", filters.category);

    if (filters.gender === NONE_VALUE) query = query.is("gender", null);
    else if (filters.gender) query = query.eq("gender", filters.gender);

    if (filters.available !== null) query = query.eq("available", filters.available);
    if (filters.onSale !== null) query = query.eq("is_on_sale", filters.onSale);

    if (filters.q.trim() !== "") {
      // `%` y `_` son comodines de LIKE: se escapan para buscarlos literalmente.
      const needle = filters.q.trim().replace(/[\\%_]/g, (match) => `\\${match}`);
      query = query.ilike("name", `%${needle}%`);
    }

    switch (filters.sort) {
      case "name":
        query = query.order("name", { ascending: true, nullsFirst: false });
        break;
      case "price_asc":
        query = query.order("current_price", { ascending: true, nullsFirst: false });
        break;
      case "price_desc":
        query = query.order("current_price", { ascending: false, nullsFirst: false });
        break;
      case "published":
        query = query.order("published_at", { ascending: false, nullsFirst: false });
        break;
      case "last_seen":
      default:
        query = query.order("last_seen_at", { ascending: false, nullsFirst: false });
        break;
    }

    // Desempate estable: sin esto, dos filas con el mismo valor pueden cambiar
    // de pagina entre peticiones.
    query = query.order("id", { ascending: true });

    const page = Math.max(filters.page, 1);
    const from = (page - 1) * PRODUCTS_PAGE_SIZE;
    const { data, error, count } = await query.range(from, from + PRODUCTS_PAGE_SIZE - 1);

    if (error) return { ok: false, error: toMessage(error) };

    const rows = (data ?? []) as unknown as ListRow[];

    const items: ProductListItem[] = rows.map((row) => {
      const sizes = row.product_sizes ?? [];
      return {
        id: row.id,
        name: row.name,
        thumbnail_image_url: row.thumbnail_image_url,
        main_image_url: row.main_image_url,
        currency: row.currency,
        current_price: row.current_price,
        original_price: row.original_price,
        is_on_sale: row.is_on_sale,
        available: row.available,
        gender: row.gender,
        color_hex: row.color_hex,
        color_name: row.color_name,
        product_type: row.product_type,
        category_locked: row.category_locked ?? false,
        last_seen_at: row.last_seen_at,
        brandId: row.brand?.id ?? null,
        brandName: row.brand?.name ?? null,
        categoryId: row.category?.id ?? null,
        categoryName: row.category?.name ?? null,
        sizesTotal: sizes.length,
        sizesAvailable: sizes.filter((size) => size.available === true).length,
      };
    });

    const total = count ?? 0;

    return {
      ok: true,
      data: {
        items,
        total,
        page,
        pageSize: PRODUCTS_PAGE_SIZE,
        totalPages: Math.max(Math.ceil(total / PRODUCTS_PAGE_SIZE), 1),
      },
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Marcas y categorias para los desplegables de filtro y para el editor. */
export async function getFilterOptions(): Promise<
  QueryResult<{
    brands: Array<Pick<Brand, "id" | "name">>;
    categories: Array<Pick<Category, "id" | "name">>;
  }>
> {
  try {
    const supabase = getSupabase();
    const [brands, categories] = await Promise.all([
      supabase.from("brands").select("id, name").order("name", { ascending: true }),
      supabase.from("categories").select("id, name").order("name", { ascending: true }),
    ]);

    const error = brands.error ?? categories.error;
    if (error) return { ok: false, error: toMessage(error) };

    return {
      ok: true,
      data: {
        brands: (brands.data ?? []) as unknown as Array<Pick<Brand, "id" | "name">>,
        categories: (categories.data ?? []) as unknown as Array<Pick<Category, "id" | "name">>,
      },
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Solo las categorias (para el editor del detalle). */
export async function getCategories(): Promise<QueryResult<Array<Pick<Category, "id" | "name">>>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) return { ok: false, error: toMessage(error) };
    return { ok: true, data: (data ?? []) as unknown as Array<Pick<Category, "id" | "name">> };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Historial de precios: como mucho los ultimos 500 puntos. */
const PRICE_HISTORY_LIMIT = 500;

/** Detalle de un producto. `null` si no existe. */
export async function getProductDetail(id: Uuid): Promise<QueryResult<ProductDetailData | null>> {
  try {
    const supabase = getSupabase();

    const [productResult, sizesResult, historyResult] = await Promise.all([
      supabase
        .from("products")
        .select("*, brand:brands(id, name, url), category:categories(id, name)")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("product_sizes")
        .select("*")
        .eq("product_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("product_price_history")
        .select("*")
        .eq("product_id", id)
        .order("scraped_at", { ascending: true })
        .limit(PRICE_HISTORY_LIMIT),
    ]);

    if (productResult.error) return { ok: false, error: toMessage(productResult.error) };
    if (!productResult.data) return { ok: true, data: null };

    const raw = productResult.data as unknown as Product & {
      brand?: Pick<Brand, "id" | "name" | "url"> | null;
      category?: Pick<Category, "id" | "name"> | null;
    };

    // Las relaciones embebidas no son columnas de la tabla: se separan para
    // que el JSON de la pestaña "JSON BD" refleje la fila tal cual.
    const { brand = null, category = null, ...product } = raw;

    return {
      ok: true,
      data: {
        product: product as Product,
        brand,
        category,
        sizes: (sizesResult.data ?? []) as unknown as ProductSize[],
        priceHistory: (historyResult.data ?? []) as unknown as ProductPriceHistory[],
      },
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/* ------------------------------------------------------------------ */
/* JSON de Shopify                                                     */
/* ------------------------------------------------------------------ */

const SHOPIFY_TIMEOUT_MS = 10_000;

export type ShopifyFetchResult =
  { ok: true; data: unknown; url: string } | { ok: false; error: string; url: string | null };

/**
 * Pide `${product_url}.json`, que es lo que devuelve Shopify con el producto
 * original. Timeout de 10 s y mensajes claros si la tienda no responde o no
 * contesta JSON de Shopify.
 */
export async function fetchShopifyProduct(
  productUrl: string | null | undefined,
): Promise<ShopifyFetchResult> {
  if (!productUrl) {
    return { ok: false, error: "Este producto no tiene `product_url` guardada.", url: null };
  }

  let target: string;
  try {
    const parsed = new URL(productUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "La URL del producto no es http(s).", url: productUrl };
    }
    parsed.search = "";
    parsed.hash = "";
    target = `${parsed.toString().replace(/\/+$/, "")}.json`;
  } catch {
    return { ok: false, error: `La URL guardada no es válida: ${productUrl}`, url: productUrl };
  }

  try {
    const response = await fetch(target, {
      signal: AbortSignal.timeout(SHOPIFY_TIMEOUT_MS),
      cache: "no-store",
      redirect: "follow",
      headers: { Accept: "application/json", "User-Agent": "emer-admin/1.0" },
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `La tienda ha respondido ${response.status} ${response.statusText}. Puede que el producto ya no exista.`,
        url: target,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();

    if (!contentType.includes("json")) {
      return {
        ok: false,
        error: `La tienda ha devuelto "${contentType || "contenido sin tipo"}" en vez de JSON. Puede que no sea una tienda Shopify.`,
        url: target,
      };
    }

    try {
      return { ok: true, data: JSON.parse(body) as unknown, url: target };
    } catch {
      return { ok: false, error: "La respuesta no es JSON válido.", url: target };
    }
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        ok: false,
        error: `La tienda no ha respondido en ${SHOPIFY_TIMEOUT_MS / 1000} s.`,
        url: target,
      };
    }
    return {
      ok: false,
      error: `No se ha podido conectar con la tienda: ${toMessage(error)}`,
      url: target,
    };
  }
}
