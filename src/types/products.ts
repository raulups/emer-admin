/**
 * Tipos de vista de la seccion Productos. Igual que `@/types/brands`, viven
 * aparte de las consultas (`server-only`) para poder usarlos en el cliente.
 */

import type {
  Brand,
  Category,
  Gender,
  Product,
  ProductPriceHistory,
  ProductSize,
  Uuid,
} from "@/types/db";

/** Fila de la tabla del listado. */
export interface ProductListItem {
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
  category_locked: boolean;
  last_seen_at: string | null;
  brandId: Uuid | null;
  brandName: string | null;
  categoryId: Uuid | null;
  categoryName: string | null;
  sizesTotal: number;
  sizesAvailable: number;
}

/** Pagina de resultados del listado. */
export interface ProductsPage {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Detalle completo: lo que se pinta en la pestaña VISTA y en JSON BD. */
export interface ProductDetailData {
  product: Product;
  brand: Pick<Brand, "id" | "name" | "url"> | null;
  category: Pick<Category, "id" | "name"> | null;
  sizes: ProductSize[];
  priceHistory: ProductPriceHistory[];
}

/* ------------------------------------------------------------------ */
/* Filtros (viven en la URL)                                           */
/* ------------------------------------------------------------------ */

/** Valor del filtro de categoria/genero cuando se busca "sin asignar". */
export const NONE_VALUE = "none";

export const PRODUCT_SORTS = ["last_seen", "name", "price_asc", "price_desc", "published"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  last_seen: "Visto por última vez",
  name: "Nombre (A-Z)",
  price_asc: "Precio (menor)",
  price_desc: "Precio (mayor)",
  published: "Fecha de publicación",
};

/** Filtros ya normalizados a partir de los searchParams. */
export interface ProductFilters {
  brand: Uuid | null;
  /** Uuid de categoria, `NONE_VALUE` para "sin categoría", o `null`. */
  category: string | null;
  /** Genero, `NONE_VALUE` para "sin género", o `null`. */
  gender: string | null;
  /** `true` / `false` / `null` (sin filtrar). */
  available: boolean | null;
  onSale: boolean | null;
  q: string;
  sort: ProductSort;
  page: number;
}

export const PRODUCTS_PAGE_SIZE = 50;

export const GENDER_LABELS: Record<Gender, string> = {
  men: "Hombre",
  women: "Mujer",
  unisex: "Unisex",
};
