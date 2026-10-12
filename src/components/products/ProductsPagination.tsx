import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { buildProductsQuery } from "@/lib/product-filters";
import { cn, formatNumber } from "@/lib/utils";
import type { ProductFilters, ProductsPage } from "@/types/products";

/**
 * Paginacion con enlaces reales (no botones): cada pagina tiene su propia URL,
 * se puede abrir en otra pestaña y el navegador la precarga.
 */
export function ProductsPagination({
  page,
  filters,
}: {
  page: ProductsPage;
  filters: ProductFilters;
}) {
  if (page.total === 0) return null;

  const hrefFor = (target: number) =>
    `/products${buildProductsQuery(filters, { page: target > 1 ? String(target) : null })}`;

  const first = (page.page - 1) * page.pageSize + 1;
  const last = Math.min(page.page * page.pageSize, page.total);

  const hasPrev = page.page > 1;
  const hasNext = page.page < page.totalPages;

  const disabled = "pointer-events-none opacity-40";

  return (
    <nav
      aria-label="Paginación"
      className="border-ink bg-paper shadow-hard mt-4 flex flex-wrap items-center justify-between gap-3 border-2 p-3"
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
          href={hrefFor(1)}
          aria-disabled={!hasPrev}
          tabIndex={hasPrev ? undefined : -1}
          className={cn(buttonClasses("secondary", "sm"), !hasPrev && disabled)}
        >
          « Primera
        </Link>
        <Link
          href={hrefFor(page.page - 1)}
          aria-disabled={!hasPrev}
          tabIndex={hasPrev ? undefined : -1}
          className={cn(buttonClasses("secondary", "sm"), !hasPrev && disabled)}
        >
          ‹ Anterior
        </Link>
        <Link
          href={hrefFor(page.page + 1)}
          aria-disabled={!hasNext}
          tabIndex={hasNext ? undefined : -1}
          className={cn(buttonClasses("secondary", "sm"), !hasNext && disabled)}
        >
          Siguiente ›
        </Link>
        <Link
          href={hrefFor(page.totalPages)}
          aria-disabled={!hasNext}
          tabIndex={hasNext ? undefined : -1}
          className={cn(buttonClasses("secondary", "sm"), !hasNext && disabled)}
        >
          Última »
        </Link>
      </div>
    </nav>
  );
}
