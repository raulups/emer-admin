import type { BadgeTone } from "@/components/ui/Badge";
import type { IsoDateTime, Json, Uuid } from "@/types/db";

export const SCRAPE_RUN_STATES = ["running", "success", "partial", "error", "stuck"] as const;
export type ScrapeRunState = (typeof SCRAPE_RUN_STATES)[number];

export const SCRAPE_RUN_STATE_LABELS: Record<ScrapeRunState, string> = {
  running: "En curso",
  success: "Finalizada",
  partial: "Finalizada con avisos",
  error: "Error",
  stuck: "Bloqueada",
};

export const SCRAPE_RUN_STATE_TONES: Record<ScrapeRunState, BadgeTone> = {
  running: "progress",
  success: "ok",
  partial: "progress",
  error: "error",
  stuck: "neutral",
};

export const DETAIL_STATES: readonly ScrapeRunState[] = ["success", "partial", "error"];

export function hasDetail(status: ScrapeRunState): boolean {
  return DETAIL_STATES.includes(status);
}

export function errorCodeLabel(code: string | null | undefined): string {
  switch (code) {
    case "403":
    case "429":
      return "Bloqueada por la marca";
    case "404":
      return "URL no encontrada";
    case "timeout":
      return "Tiempo agotado";
    case "no_url":
      return "Marca sin URL";
    case "empty":
      return "Sin productos";
    case "upsert":
      return "Fallo al guardar";
    default:
      return "Error";
  }
}

export interface ScrapeRunAdminRow {
  id: Uuid;
  brand_id: Uuid | null;
  brand_name: string | null;
  started_at: IsoDateTime | null;
  finished_at: IsoDateTime | null;
  status: ScrapeRunState;
  products_found: number | null;
  products_upserted: number | null;
  error_message: string | null;
  error_code?: string | null;
}

export interface ScrapeRunCounts {
  running: number;
  success: number;
  partial: number;
  error: number;
  stuck: number;
}

export interface ScrapeRunsFilters {
  brand: Uuid | null;
  status: ScrapeRunState | null;
}

export const RUN_PRODUCT_ACTIONS = ["created", "updated"] as const;
export type RunProductAction = (typeof RUN_PRODUCT_ACTIONS)[number];

export const RUN_PRODUCT_ACTION_LABELS: Record<RunProductAction, string> = {
  created: "Creado",
  updated: "Modificado",
};

export interface ScrapeRunProductRow {
  id: number;
  run_id: Uuid;
  product_id: Uuid | null;
  external_id: string | null;
  name: string | null;
  action: RunProductAction;
  changes: Json | null;
  created_at: IsoDateTime | null;
}

export interface RunProductsFilters {
  action: RunProductAction | null;
  q: string;
  page: number;
}

export interface RunProductsPage {
  items: ScrapeRunProductRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  createdCount: number;
  updatedCount: number;
}

export const SCRAPES_LIMIT = 200;
export const RUN_PRODUCTS_PAGE_SIZE = 50;
