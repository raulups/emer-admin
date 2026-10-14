import {
  RUN_PRODUCT_ACTIONS,
  SCRAPE_RUN_STATES,
  type RunProductAction,
  type RunProductsFilters,
  type ScrapeRunState,
  type ScrapeRunsFilters,
} from "@/types/scrapes";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function parseScrapeRunsFilters(params: RawSearchParams): ScrapeRunsFilters {
  const brand = first(params.brand);
  const status = first(params.status);
  return {
    brand: brand && UUID.test(brand) ? brand : null,
    status: SCRAPE_RUN_STATES.includes(status as ScrapeRunState)
      ? (status as ScrapeRunState)
      : null,
  };
}

export function parseRunProductsFilters(params: RawSearchParams): RunProductsFilters {
  const action = first(params.action);
  const page = Number(first(params.page) ?? "1");
  return {
    action: RUN_PRODUCT_ACTIONS.includes(action as RunProductAction)
      ? (action as RunProductAction)
      : null,
    q: (first(params.q) ?? "").trim(),
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  };
}

export function buildQuery(
  current: Record<string, string | number | null>,
  changes: Record<string, string | number | null> = {},
): string {
  const merged = { ...current, ...changes };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value === null || value === "") continue;
    if (key === "page" && Number(value) <= 1) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
