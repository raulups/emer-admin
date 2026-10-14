import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { buildQuery } from "@/lib/scrape-filters";
import { cn, formatNumber } from "@/lib/utils";
import type { Uuid } from "@/types/db";
import type { RunProductsFilters, RunProductsPage } from "@/types/scrapes";

export function RunProductsPagination({
  runId,
  page,
  filters,
}: {
  runId: Uuid;
  page: RunProductsPage;
  filters: RunProductsFilters;
}) {
  if (page.total === 0) return null;

  const current = { action: filters.action, q: filters.q || null, page: filters.page };
  const hrefFor = (target: number) => `/scraper/${runId}${buildQuery(current, { page: target })}`;

  const first = (page.page - 1) * page.pageSize + 1;
  const last = Math.min(page.page * page.pageSize, page.total);
  const hasPrev = page.page > 1;
  const hasNext = page.page < page.totalPages;
  const disabled = "pointer-events-none opacity-40";

  return (
    <nav
      aria-label="Paginación"
      className="border-ink flex flex-wrap items-center justify-between gap-3 border-t-2 p-3"
    >
      <p className="text-ink/70 text-xs">
        <span className="text-ink font-bold">
          {formatNumber(first)}–{formatNumber(last)}
        </span>{" "}
        de {formatNumber(page.total)} · página {formatNumber(page.page)} de{" "}
        {formatNumber(page.totalPages)}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={hrefFor(page.page - 1)}
          scroll={false}
          aria-disabled={!hasPrev}
          tabIndex={hasPrev ? undefined : -1}
          className={cn(buttonClasses("secondary", "sm"), !hasPrev && disabled)}
        >
          ‹ Anterior
        </Link>
        <Link
          href={hrefFor(page.page + 1)}
          scroll={false}
          aria-disabled={!hasNext}
          tabIndex={hasNext ? undefined : -1}
          className={cn(buttonClasses("secondary", "sm"), !hasNext && disabled)}
        >
          Siguiente ›
        </Link>
      </div>
    </nav>
  );
}
