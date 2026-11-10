import type { RawSearchParams } from "@/lib/scrape-filters";
import { OUTREACH_STATUSES, type OutreachStatus } from "@/types/db";
import type { OutreachFilters, OutreachListItem } from "@/types/outreach";

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function parseOutreachFilters(params: RawSearchParams): OutreachFilters {
  const status = first(params.status);
  return {
    status: OUTREACH_STATUSES.includes(status as OutreachStatus)
      ? (status as OutreachStatus)
      : null,
    q: (first(params.q) ?? "").trim(),
    due: first(params.due) === "1",
  };
}

function norm(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function filterOutreach(
  items: OutreachListItem[],
  filters: OutreachFilters,
): OutreachListItem[] {
  const q = norm(filters.q);
  return items.filter((item) => {
    if (filters.status && item.status !== filters.status) return false;
    if (filters.due && !item.followUpDue) return false;
    if (q !== "") {
      const haystack = norm(
        [
          item.brand.name,
          item.brand.url,
          item.outreach?.instagram,
          item.outreach?.email,
          item.outreach?.contact_name,
        ]
          .filter(Boolean)
          .join(" "),
      );
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
