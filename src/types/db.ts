/**
 * Tipos de la base de datos de Emer (Postgres / Supabase, schema `public`).
 *
 * Escritos a mano a proposito: no usamos `supabase gen types`.
 * Convenciones:
 *  - `Row` = fila tal y como la devuelve un SELECT.
 *  - `Insert` / `Update` = payloads para mutaciones (los campos con default son opcionales).
 *  - Las columnas `timestamptz` llegan como string ISO.
 *  - `numeric` llega como number (PostgREST lo serializa como numero).
 */

/* ------------------------------------------------------------------ */
/* Enums y alias                                                       */
/* ------------------------------------------------------------------ */

/** Enum `brand_tag` de Postgres. */
export const BRAND_TAGS = [
  "popular",
  "emergente",
  "novedad",
  "destacada",
  "sostenible",
  "drops",
] as const;
export type BrandTag = (typeof BRAND_TAGS)[number];

/** Estado de un `scrape_runs`. */
export const SCRAPE_STATUSES = ["running", "success", "partial", "error"] as const;
export type ScrapeStatus = (typeof SCRAPE_STATUSES)[number];

/** Estado de stock de una talla. */
export const STOCK_STATUSES = ["in_stock", "out_of_stock"] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

/** Genero de un producto. `null` cuando no se ha podido deducir. */
export const GENDERS = ["men", "women", "unisex"] as const;
export type Gender = (typeof GENDERS)[number];

export type Uuid = string;

/** `timestamptz` serializado como ISO 8601. */
export type IsoDateTime = string;

/** JSON arbitrario, tal y como lo guarda una columna `jsonb`. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/* ------------------------------------------------------------------ */
/* brands                                                              */
/* ------------------------------------------------------------------ */

export interface Brand {
  id: Uuid;
  name: string;
  url: string | null;
  /** Imagen de portada / hero de la marca. */
  img: string | null;
  logo: string | null;
  /** Hex CON almohadilla. Puede tener 8 digitos (alpha) o venir vacio / null. */
  color: string | null;
  created_at: IsoDateTime | null;
  /** `brand_tag[]`, not null, default vacio. */
  tags: BrandTag[];
  founded_year: number | null;
  style: string | null;
}

export type BrandInsert = {
  id?: Uuid;
  name: string;
  url?: string | null;
  img?: string | null;
  logo?: string | null;
  color?: string | null;
  created_at?: IsoDateTime | null;
  tags?: BrandTag[];
  founded_year?: number | null;
  style?: string | null;
};

export type BrandUpdate = Partial<Omit<Brand, "id">>;

/* ------------------------------------------------------------------ */
/* categories                                                          */
/* ------------------------------------------------------------------ */

/** 15 categorias planas (sin jerarquia). `name` es unico. */
export interface Category {
  id: Uuid;
  name: string;
  created_at: IsoDateTime | null;
}

export type CategoryInsert = { id?: Uuid; name: string; created_at?: IsoDateTime | null };
export type CategoryUpdate = Partial<Omit<Category, "id">>;

/* ------------------------------------------------------------------ */
/* products                                                            */
/* ------------------------------------------------------------------ */

/**
 * Entrada de la columna desnormalizada `products.sizes` (jsonb), que el scraper
 * mantiene en paralelo a la tabla `product_sizes`. Para leer tallas usa
 * `product_sizes`, que es la fuente normalizada y trae `variant_id` y precios.
 */
export interface ProductSizeSnapshot {
  sku: string | null;
  available: boolean | null;
  size_label: string | null;
  stock_status: StockStatus | null;
  stock_quantity: number | null;
}

/** Imagen tal y como viene en la columna `images` (jsonb). */
export interface ProductImage {
  src: string;
  width: number | null;
  height: number | null;
}

/** Contenido de la columna `attributes` (jsonb). Todo opcional: lo escribe el scraper. */
export interface ProductAttributes {
  tags?: string[];
  product_type?: string | null;
  vendor?: string | null;
  options?: Array<{ name: string; values: string[] }>;
  colors?: string[];
  badges?: string[];
  [key: string]: Json | undefined;
}

export interface Product {
  id: Uuid;
  brand_id: Uuid;
  category_id: Uuid | null;
  /** Si es `true`, el scraper NO sobrescribe `category_id`. */
  category_locked: boolean;
  /** Id del producto en Shopify. Unico junto a `brand_id`. */
  external_id: string | null;
  handle: string | null;
  name: string | null;
  description: string | null;
  product_url: string | null;
  /** `char(3)`: codigo ISO de moneda (p. ej. EUR). */
  currency: string | null;
  current_price: number | null;
  /** Solo se rellena si hay descuento. */
  original_price: number | null;
  min_price: number | null;
  max_price: number | null;
  is_on_sale: boolean | null;
  available: boolean | null;
  main_image_url: string | null;
  thumbnail_image_url: string | null;
  /** jsonb: array de urls. */
  image_urls: string[] | null;
  /** jsonb: array de `{ src, width, height }`. Casi siempre vacio: usa `image_urls`. */
  images: ProductImage[] | null;
  /** jsonb: copia desnormalizada de las tallas. La fuente es `product_sizes`. */
  sizes: ProductSizeSnapshot[] | null;
  color_name: string | null;
  /** Hex SIN almohadilla. */
  color_hex: string | null;
  attributes: ProductAttributes | null;
  gender: Gender | null;
  product_type: string | null;
  vendor: string | null;
  tags: string[] | null;
  published_at: IsoDateTime | null;
  source_created_at: IsoDateTime | null;
  source_updated_at: IsoDateTime | null;
  last_seen_at: IsoDateTime | null;
  created_at: IsoDateTime | null;
  updated_at: IsoDateTime | null;
}

export type ProductInsert = {
  id?: Uuid;
  brand_id: Uuid;
  category_id?: Uuid | null;
  category_locked?: boolean;
  external_id?: string | null;
  handle?: string | null;
  name?: string | null;
  description?: string | null;
  product_url?: string | null;
  currency?: string | null;
  current_price?: number | null;
  original_price?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  is_on_sale?: boolean | null;
  available?: boolean | null;
  main_image_url?: string | null;
  thumbnail_image_url?: string | null;
  image_urls?: string[] | null;
  images?: ProductImage[] | null;
  sizes?: ProductSizeSnapshot[] | null;
  color_name?: string | null;
  color_hex?: string | null;
  attributes?: ProductAttributes | null;
  gender?: Gender | null;
  product_type?: string | null;
  vendor?: string | null;
  tags?: string[] | null;
  published_at?: IsoDateTime | null;
  source_created_at?: IsoDateTime | null;
  source_updated_at?: IsoDateTime | null;
  last_seen_at?: IsoDateTime | null;
  created_at?: IsoDateTime | null;
  updated_at?: IsoDateTime | null;
};

export type ProductUpdate = Partial<Omit<Product, "id" | "brand_id">>;

/** Producto con marca y categoria resueltas (join tipico del panel). */
export interface ProductWithRelations extends Product {
  brand: Pick<Brand, "id" | "name"> | null;
  category: Pick<Category, "id" | "name"> | null;
}

/* ------------------------------------------------------------------ */
/* product_sizes                                                       */
/* ------------------------------------------------------------------ */

export interface ProductSize {
  id: Uuid;
  product_id: Uuid;
  /** Id de la variante en Shopify. */
  variant_id: string | null;
  size_label: string | null;
  size_normalized: string | null;
  sku: string | null;
  stock_status: StockStatus | null;
  /** Columna GENERADA a partir de `stock_status`: no se escribe nunca. */
  available: boolean | null;
  price: number | null;
  compare_at_price: number | null;
  stock_quantity: number | null;
  created_at: IsoDateTime | null;
  updated_at: IsoDateTime | null;
}

export type ProductSizeInsert = {
  id?: Uuid;
  product_id: Uuid;
  variant_id?: string | null;
  size_label?: string | null;
  size_normalized?: string | null;
  sku?: string | null;
  stock_status?: StockStatus | null;
  price?: number | null;
  compare_at_price?: number | null;
  stock_quantity?: number | null;
  created_at?: IsoDateTime | null;
  updated_at?: IsoDateTime | null;
};

export type ProductSizeUpdate = Partial<Omit<ProductSize, "id" | "product_id" | "available">>;

/* ------------------------------------------------------------------ */
/* product_price_history                                               */
/* ------------------------------------------------------------------ */

export interface ProductPriceHistory {
  id: Uuid;
  product_id: Uuid;
  price: number | null;
  currency: string | null;
  scraped_at: IsoDateTime | null;
}

/* ------------------------------------------------------------------ */
/* scrape_runs                                                         */
/* ------------------------------------------------------------------ */

export interface ScrapeRun {
  id: Uuid;
  brand_id: Uuid | null;
  started_at: IsoDateTime | null;
  finished_at: IsoDateTime | null;
  status: ScrapeStatus;
  products_found: number | null;
  products_upserted: number | null;
  error_message: string | null;
}

export type ScrapeRunInsert = {
  id?: Uuid;
  brand_id?: Uuid | null;
  started_at?: IsoDateTime | null;
  finished_at?: IsoDateTime | null;
  status: ScrapeStatus;
  products_found?: number | null;
  products_upserted?: number | null;
  error_message?: string | null;
};

export type ScrapeRunUpdate = Partial<Omit<ScrapeRun, "id">>;

/** Run con el nombre de la marca resuelto. */
export interface ScrapeRunWithBrand extends ScrapeRun {
  brand: Pick<Brand, "id" | "name"> | null;
}

/* ------------------------------------------------------------------ */
/* Clasificacion                                                       */
/* ------------------------------------------------------------------ */

/** Regla global por palabra clave. A mayor `priority`, mas manda. */
export interface CategoryKeywordRule {
  id: Uuid;
  /** Unico, siempre en minusculas. */
  keyword: string;
  category_id: Uuid | null;
  priority: number | null;
  created_at: IsoDateTime | null;
}

export type CategoryKeywordRuleInsert = {
  id?: Uuid;
  keyword: string;
  category_id: Uuid | null;
  priority?: number | null;
  created_at?: IsoDateTime | null;
};

export type CategoryKeywordRuleUpdate = Partial<Omit<CategoryKeywordRule, "id">>;

export interface CategoryKeywordRuleWithCategory extends CategoryKeywordRule {
  category: Pick<Category, "id" | "name"> | null;
}

/** Mapeo por tienda: `external_category_name` se compara con `product_type` en minusculas. */
export interface ShopCategoryMapping {
  id: Uuid;
  brand_id: Uuid;
  external_category_name: string;
  category_id: Uuid | null;
  created_at: IsoDateTime | null;
}

export type ShopCategoryMappingInsert = {
  id?: Uuid;
  brand_id: Uuid;
  external_category_name: string;
  category_id: Uuid | null;
  created_at?: IsoDateTime | null;
};

export type ShopCategoryMappingUpdate = Partial<Omit<ShopCategoryMapping, "id">>;

export interface ShopCategoryMappingWithRelations extends ShopCategoryMapping {
  brand: Pick<Brand, "id" | "name"> | null;
  category: Pick<Category, "id" | "name"> | null;
}

/* ------------------------------------------------------------------ */
/* store_locations                                                     */
/* ------------------------------------------------------------------ */

export interface StoreLocation {
  id: Uuid;
  brand_id: Uuid;
  name: string | null;
  address: string;
  city: string;
  country: string | null;
  latitude: number;
  longitude: number;
  /** Place id de Google Maps, si se geocodifico. */
  place_id: string | null;
  is_active: boolean | null;
  /** Origen del dato (p. ej. manual, google). */
  source: string | null;
  created_at: IsoDateTime | null;
}

export type StoreLocationInsert = {
  id?: Uuid;
  brand_id: Uuid;
  name?: string | null;
  address: string;
  city: string;
  country?: string | null;
  latitude: number;
  longitude: number;
  place_id?: string | null;
  is_active?: boolean | null;
  source?: string | null;
  created_at?: IsoDateTime | null;
};

export type StoreLocationUpdate = Partial<Omit<StoreLocation, "id">>;

export interface StoreLocationWithBrand extends StoreLocation {
  brand: Pick<Brand, "id" | "name"> | null;
}

/* ------------------------------------------------------------------ */
/* Diccionarios                                                        */
/* ------------------------------------------------------------------ */

/** `alias` es la PK. Normaliza tallas: "talla m" -> "M". */
export interface SizeAlias {
  alias: string;
  size_normalized: string | null;
}

/** `keyword` es la PK. `color_hex` SIN almohadilla. */
export interface ColorDictionaryEntry {
  keyword: string;
  color_name: string | null;
  color_hex: string | null;
}

/* ------------------------------------------------------------------ */
/* Vistas                                                              */
/* ------------------------------------------------------------------ */

/**
 * Vista `brands_with_preview_products`: todas las columnas de `brands` mas
 * unos productos de muestra y los contadores agregados.
 *
 * `category_counts` mapea `category_id -> nº de productos` y SOLO incluye
 * productos ya clasificados, asi que los que no tienen categoria son
 * `total_product_count - suma(category_counts)`.
 */
export interface BrandWithPreviewProducts extends Brand {
  preview_products: Array<{
    id: Uuid;
    currency: string | null;
    current_price: number | null;
    main_image_url: string | null;
  }> | null;
  total_product_count: number | null;
  on_sale_count: number | null;
  category_counts: Record<Uuid, number> | null;
}

/** Vista `unclassified_products`: productos sin `category_id`. */
export interface UnclassifiedProduct {
  id: Uuid;
  name: string | null;
  attributes: ProductAttributes | null;
  brand_name: string | null;
}

/* ------------------------------------------------------------------ */
/* RPC                                                                 */
/* ------------------------------------------------------------------ */

/** Argumentos de `admin_delete_brand`. */
export interface AdminDeleteBrandArgs {
  p_brand_id: Uuid;
}

/** Respuesta de `admin_delete_brand`. */
export interface AdminDeleteBrandResult {
  deleted_products: number;
}

/* ------------------------------------------------------------------ */
/* Nombres de tabla y vista                                            */
/* ------------------------------------------------------------------ */

export const TABLES = {
  brands: "brands",
  categories: "categories",
  products: "products",
  productSizes: "product_sizes",
  productPriceHistory: "product_price_history",
  scrapeRuns: "scrape_runs",
  categoryKeywordRules: "category_keyword_rules",
  shopCategoryMappings: "shop_category_mappings",
  storeLocations: "store_locations",
  sizeAliases: "size_aliases",
  colorDictionary: "color_dictionary",
  brandsWithPreviewProducts: "brands_with_preview_products",
  unclassifiedProducts: "unclassified_products",
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
