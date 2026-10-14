import "server-only";

import type { QueryResult } from "@/lib/queries/brands";
import { getSupabase } from "@/lib/supabase";
import type { Uuid } from "@/types/db";
import {
  RUN_PRODUCTS_PAGE_SIZE,
  SCRAPES_LIMIT,
  type RunProductsFilters,
  type RunProductsPage,
  type ScrapeRunAdminRow,
  type ScrapeRunCounts,
  type ScrapeRunProductRow,
  type ScrapeRunState,
  type ScrapeRunsFilters,
} from "@/types/scrapes";

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Error desconocido al consultar Supabase";
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export async function getScrapeRunsAdmin(
  filters: ScrapeRunsFilters,
): Promise<QueryResult<ScrapeRunAdminRow[]>> {
  try {
    let query = getSupabase()
      .from("scrape_runs_admin")
      .select("*")
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(SCRAPES_LIMIT);

    if (filters.brand) query = query.eq("brand_id", filters.brand);
    if (filters.status) query = query.eq("status", filters.status);

    const { data, error } = await query;
    if (error) return { ok: false, error: toMessage(error) };
    return { ok: true, data: (data ?? []) as unknown as ScrapeRunAdminRow[] };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function getScrapeRunCounts(): Promise<QueryResult<ScrapeRunCounts>> {
  try {
    const supabase = getSupabase();
    const states: ScrapeRunState[] = ["running", "success", "partial", "error", "stuck"];

    const results = await Promise.all(
      states.map((status) =>
        supabase
          .from("scrape_runs_admin")
          .select("id", { count: "exact", head: true })
          .eq("status", status),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) return { ok: false, error: toMessage(failed.error) };

    const [running, success, partial, error, stuck] = results.map((result) => result.count ?? 0);

    return {
      ok: true,
      data: {
        running: running ?? 0,
        success: success ?? 0,
        partial: partial ?? 0,
        error: error ?? 0,
        stuck: stuck ?? 0,
      },
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function getScrapeRunAdmin(id: Uuid): Promise<QueryResult<ScrapeRunAdminRow | null>> {
  try {
    const { data, error } = await getSupabase()
      .from("scrape_runs_admin")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) return { ok: false, error: toMessage(error) };
    return { ok: true, data: (data ?? null) as unknown as ScrapeRunAdminRow | null };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}

export async function getRunProducts(
  runId: Uuid,
  filters: RunProductsFilters,
): Promise<QueryResult<RunProductsPage>> {
  try {
    const supabase = getSupabase();
    const pageSize = RUN_PRODUCTS_PAGE_SIZE;
    const from = (filters.page - 1) * pageSize;

    let query = supabase
      .from("scrape_run_products")
      .select("id, run_id, product_id, external_id, name, action, changes, created_at", {
        count: "exact",
      })
      .eq("run_id", runId)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (filters.action) query = query.eq("action", filters.action);
    if (filters.q) query = query.ilike("name", `%${escapeLike(filters.q)}%`);

    const countFor = (action: string) =>
      supabase
        .from("scrape_run_products")
        .select("id", { count: "exact", head: true })
        .eq("run_id", runId)
        .eq("action", action);

    const [pageResult, createdResult, updatedResult] = await Promise.all([
      query,
      countFor("created"),
      countFor("updated"),
    ]);

    if (pageResult.error) return { ok: false, error: toMessage(pageResult.error) };

    const total = pageResult.count ?? 0;

    return {
      ok: true,
      data: {
        items: (pageResult.data ?? []) as unknown as ScrapeRunProductRow[],
        total,
        page: filters.page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        createdCount: createdResult.count ?? 0,
        updatedCount: updatedResult.count ?? 0,
      },
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
