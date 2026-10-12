import "server-only";

import type { QueryResult } from "@/lib/queries/brands";
import { getSupabase } from "@/lib/supabase";
import type { Brand, ScrapeStatus, Uuid } from "@/types/db";
import type { ProblemBrand, ProblemReason, RunsResponse, ScrapeRunRow } from "@/types/scraper";
import { RUNS_LIMIT, STALE_RUN_MINUTES } from "@/types/scraper";

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Error desconocido al consultar Supabase";
}

const RUN_SELECT =
  "id, brand_id, started_at, finished_at, status, products_found, products_upserted, error_message, brand:brands(id, name)";

interface RawRun {
  id: Uuid;
  brand_id: Uuid | null;
  started_at: string | null;
  finished_at: string | null;
  status: ScrapeStatus;
  products_found: number | null;
  products_upserted: number | null;
  error_message: string | null;
  brand: Pick<Brand, "id" | "name"> | null;
}

/** `true` si el run lleva demasiado tiempo en `running`. */
function isStale(run: Pick<RawRun, "status" | "started_at">): boolean {
  if (run.status !== "running") return false;
  if (!run.started_at) return true;

  const started = new Date(run.started_at).getTime();
  if (Number.isNaN(started)) return true;

  return Date.now() - started > STALE_RUN_MINUTES * 60 * 1000;
}

function toRow(raw: RawRun): ScrapeRunRow {
  return {
    id: raw.id,
    brandId: raw.brand?.id ?? raw.brand_id,
    brandName: raw.brand?.name ?? null,
    status: raw.status,
    started_at: raw.started_at,
    finished_at: raw.finished_at,
    products_found: raw.products_found,
    products_upserted: raw.products_upserted,
    error_message: raw.error_message,
    stale: isStale(raw),
  };
}

export interface RunsFilters {
  brandId?: Uuid | null;
  status?: ScrapeStatus | null;
  limit?: number;
}

/** Ultimas ejecuciones, con filtros opcionales por marca y estado. */
export async function getScrapeRuns(filters: RunsFilters = {}): Promise<QueryResult<RunsResponse>> {
  try {
    const supabase = getSupabase();

    let query = supabase
      .from("scrape_runs")
      .select(RUN_SELECT)
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(filters.limit ?? RUNS_LIMIT);

    if (filters.brandId) query = query.eq("brand_id", filters.brandId);
    if (filters.status) query = query.eq("status", filters.status);

    // Los runs en curso se cuentan sobre TODA la tabla, no solo sobre la
    // pagina filtrada: el indicador debe verse aunque filtres por otra cosa.
    const [runsResult, runningResult] = await Promise.all([
      query,
      supabase
        .from("scrape_runs")
        .select("id, status, started_at")
        .eq("status", "running")
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(200),
    ]);

    if (runsResult.error) return { ok: false, error: toMessage(runsResult.error) };

    const runs = ((runsResult.data ?? []) as unknown as RawRun[]).map(toRow);

    const running = (runningResult.data ?? []) as unknown as Array<
      Pick<RawRun, "id" | "status" | "started_at">
    >;
    const staleCount = running.filter(isStale).length;

    return {
      ok: true,
      data: {
        runs,
        activeCount: running.length - staleCount,
        staleCount,
      },
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Solo los contadores, para el indicador de la sidebar. */
export async function getRunningCounts(): Promise<
  QueryResult<{ activeCount: number; staleCount: number }>
> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("scrape_runs")
      .select("id, status, started_at")
      .eq("status", "running")
      .limit(200);

    if (error) return { ok: false, error: toMessage(error) };

    const running = (data ?? []) as unknown as Array<Pick<RawRun, "id" | "status" | "started_at">>;
    const staleCount = running.filter(isStale).length;

    return { ok: true, data: { activeCount: running.length - staleCount, staleCount } };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** El run mas reciente de una marca. `null` si nunca se ha scrapeado. */
export async function getLatestRunForBrand(
  brandId: Uuid,
): Promise<QueryResult<ScrapeRunRow | null>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("scrape_runs")
      .select(RUN_SELECT)
      .eq("brand_id", brandId)
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) return { ok: false, error: toMessage(error) };
    if (!data) return { ok: true, data: null };

    return { ok: true, data: toRow(data as unknown as RawRun) };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Cuantos runs se leen para deducir el ultimo de cada marca. */
const RECENT_RUNS_LIMIT = 1000;

/**
 * Marcas que necesitan atencion: ultimo run con error o parcial, sin productos
 * o nunca scrapeadas.
 */
export async function getProblemBrands(): Promise<QueryResult<ProblemBrand[]>> {
  try {
    const supabase = getSupabase();

    const [brandsResult, runsResult] = await Promise.all([
      supabase
        .from("brands_with_preview_products")
        .select("id, name, total_product_count")
        .order("name", { ascending: true }),
      supabase
        .from("scrape_runs")
        .select("brand_id, status, started_at, error_message")
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(RECENT_RUNS_LIMIT),
    ]);

    if (brandsResult.error) return { ok: false, error: toMessage(brandsResult.error) };

    // Primer run de cada marca = el mas reciente (vienen ordenados desc).
    const lastRun = new Map<
      Uuid,
      { status: ScrapeStatus; started_at: string | null; error_message: string | null }
    >();

    for (const row of (runsResult.data ?? []) as unknown as Array<{
      brand_id: Uuid | null;
      status: ScrapeStatus;
      started_at: string | null;
      error_message: string | null;
    }>) {
      if (!row.brand_id || lastRun.has(row.brand_id)) continue;
      lastRun.set(row.brand_id, {
        status: row.status,
        started_at: row.started_at,
        error_message: row.error_message,
      });
    }

    const brands = (brandsResult.data ?? []) as unknown as Array<{
      id: Uuid;
      name: string;
      total_product_count: number | null;
    }>;

    const problems: ProblemBrand[] = [];

    for (const brand of brands) {
      const run = lastRun.get(brand.id) ?? null;
      const productsCount = Number(brand.total_product_count ?? 0);
      const reasons: ProblemReason[] = [];

      if (run?.status === "error") reasons.push("error");
      if (run?.status === "partial") reasons.push("partial");
      if (!run) reasons.push("never");
      else if (productsCount === 0) reasons.push("empty");

      if (reasons.length === 0) continue;

      problems.push({
        id: brand.id,
        name: brand.name,
        productsCount,
        lastRunStatus: run?.status ?? null,
        lastRunAt: run?.started_at ?? null,
        lastRunError: run?.error_message ?? null,
        reasons,
      });
    }

    // Primero lo que ha fallado, luego lo vacio, y dentro por nombre.
    const weight = (problem: ProblemBrand) =>
      problem.reasons.includes("error") ? 0 : problem.reasons.includes("partial") ? 1 : 2;

    problems.sort((a, b) => weight(a) - weight(b) || a.name.localeCompare(b.name, "es"));

    return { ok: true, data: problems };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

/** Marcas para el desplegable de filtro. */
export async function getBrandsForFilter(): Promise<
  QueryResult<Array<Pick<Brand, "id" | "name">>>
> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("brands")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) return { ok: false, error: toMessage(error) };
    return { ok: true, data: (data ?? []) as unknown as Array<Pick<Brand, "id" | "name">> };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
