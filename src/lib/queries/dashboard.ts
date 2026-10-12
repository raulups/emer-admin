import "server-only";

import { getSupabase } from "@/lib/supabase";
import type { ScrapeRunWithBrand } from "@/types/db";

export interface DashboardStats {
  brandsCount: number;
  productsCount: number;
  unclassifiedCount: number;
  lastRun: ScrapeRunWithBrand | null;
  failedRuns24h: number;
}

export type DashboardResult = { ok: true; stats: DashboardStats } | { ok: false; error: string };

/** Mensaje de error legible a partir de cualquier fallo (env, red o PostgREST). */
function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Error desconocido al consultar Supabase";
}

/** Contadores de la home. No lanza: devuelve el error para pintarlo en la UI. */
export async function getDashboardStats(): Promise<DashboardResult> {
  try {
    const supabase = getSupabase();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [brands, products, unclassified, lastRun, failedRuns] = await Promise.all([
      supabase.from("brands").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .is("category_id", null),
      supabase
        .from("scrape_runs")
        .select(
          "id, brand_id, started_at, finished_at, status, products_found, products_upserted, error_message, brand:brands(id, name)",
        )
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("scrape_runs")
        .select("id", { count: "exact", head: true })
        .eq("status", "error")
        .gte("started_at", since24h),
    ]);

    const firstError =
      brands.error ?? products.error ?? unclassified.error ?? lastRun.error ?? failedRuns.error;

    if (firstError) return { ok: false, error: toMessage(firstError) };

    return {
      ok: true,
      stats: {
        brandsCount: brands.count ?? 0,
        productsCount: products.count ?? 0,
        unclassifiedCount: unclassified.count ?? 0,
        lastRun: (lastRun.data as ScrapeRunWithBrand | null) ?? null,
        failedRuns24h: failedRuns.count ?? 0,
      },
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
}
