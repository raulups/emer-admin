import type { ScrapeStatus, Uuid } from "@/types/db";

/**
 * Tipos de la seccion Scraper. Como en el resto de secciones, viven aparte de
 * las consultas (`server-only`) para poder usarlos desde el cliente.
 */

/** Fila de la tabla de ejecuciones, con el nombre de la marca ya resuelto. */
export interface ScrapeRunRow {
  id: Uuid;
  brandId: Uuid | null;
  brandName: string | null;
  status: ScrapeStatus;
  started_at: string | null;
  finished_at: string | null;
  products_found: number | null;
  products_upserted: number | null;
  error_message: string | null;
  /**
   * `true` si sigue en `running` pero lleva demasiado tiempo: n8n se cayó a
   * medias o el workflow nunca cerró el run. No cuenta como actividad.
   */
  stale: boolean;
}

/** Respuesta de `GET /api/scraper/runs`. */
export interface RunsResponse {
  runs: ScrapeRunRow[];
  /** Runs realmente en curso (sin contar los atascados). */
  activeCount: number;
  /** Runs en `running` que ya se consideran atascados. */
  staleCount: number;
}

/** Marca que necesita atencion en el bloque "Marcas con problemas". */
export interface ProblemBrand {
  id: Uuid;
  name: string;
  productsCount: number;
  lastRunStatus: ScrapeStatus | null;
  lastRunAt: string | null;
  lastRunError: string | null;
  /** Motivos por los que aparece en la lista. */
  reasons: ProblemReason[];
}

export type ProblemReason = "error" | "partial" | "empty" | "never";

export const PROBLEM_REASON_LABELS: Record<ProblemReason, string> = {
  error: "Último scrape con error",
  partial: "Último scrape parcial",
  empty: "Sin productos",
  never: "Nunca se ha scrapeado",
};

/**
 * A partir de cuantos minutos se considera atascado un run en `running`.
 * Sin esto, un run que nunca cerró deja el panel refrescando para siempre.
 */
export const STALE_RUN_MINUTES = 15;

/** Cada cuanto se refresca mientras hay actividad. */
export const RUNS_POLL_MS = 3000;

/** Cada cuanto comprueba la sidebar si ha arrancado algo (sin actividad conocida). */
export const IDLE_POLL_MS = 15000;

export const STATUS_FILTER_VALUES = ["all", "running", "success", "partial", "error"] as const;
export type StatusFilter = (typeof STATUS_FILTER_VALUES)[number];

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "Todos",
  running: "En curso",
  success: "Correcto",
  partial: "Parcial",
  error: "Error",
};

/** Cuantos runs se muestran en la tabla de seguimiento. */
export const RUNS_LIMIT = 100;
