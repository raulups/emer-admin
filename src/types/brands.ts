/**
 * Tipos de vista de la seccion Marcas: lo que devuelven las consultas de
 * `src/lib/queries/brands.ts` y consumen los componentes.
 *
 * Viven aparte de las consultas (que son `server-only`) para que los Client
 * Components puedan importarlos sin arrastrar nada del servidor.
 */

import type { Brand, ScrapeRun, ScrapeStatus } from "@/types/db";

export interface BrandLastRun {
  status: ScrapeStatus;
  started_at: string | null;
  finished_at: string | null;
}

/** Fila del listado: la marca mas sus contadores y el ultimo scrape. */
export interface BrandListItem extends Brand {
  /** `null` si los contadores no se han podido calcular. */
  productsCount: number | null;
  unclassifiedCount: number | null;
  onSaleCount: number | null;
  lastRun: BrandLastRun | null;
}

export interface BrandCounts {
  total: number;
  available: number;
  onSale: number;
  unclassified: number;
}

export interface DistributionItem {
  label: string;
  count: number;
}

export interface BrandDetail {
  brand: Brand;
  counts: BrandCounts;
  byCategory: DistributionItem[];
  byGender: DistributionItem[];
  runs: ScrapeRun[];
  /** Mensaje si algun bloque secundario no se ha podido calcular. */
  warning: string | null;
}

/** Modos de vista del listado. Se guarda en localStorage. */
export const BRAND_VIEW_MODES = ["grid", "table"] as const;
export type BrandViewMode = (typeof BRAND_VIEW_MODES)[number];

/** Criterios de orden del listado. */
export const BRAND_SORTS = ["name", "created_at", "products"] as const;
export type BrandSort = (typeof BRAND_SORTS)[number];

export const BRAND_SORT_LABELS: Record<BrandSort, string> = {
  name: "Nombre (A-Z)",
  created_at: "Fecha de alta (recientes)",
  products: "Nº de productos (mayor)",
};
