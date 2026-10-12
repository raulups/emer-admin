import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { ScrapeStatusBadge } from "@/components/ScrapeStatusBadge";
import { buttonClasses } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { formatDateTime, formatNumber } from "@/lib/utils";

// El panel siempre muestra datos frescos de Supabase: nada de prerender.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await getDashboardStats();

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Resumen" description="Estado general de la base de datos de Emer." />
        <EmptyState
          tone="error"
          title="No se ha podido conectar con Supabase"
          description={result.error}
          action={
            <Link href="/" className={buttonClasses("secondary", "md")}>
              Reintentar
            </Link>
          }
        />
      </>
    );
  }

  const { brandsCount, productsCount, unclassifiedCount, lastRun, failedRuns24h } = result.stats;
  const lastRunStatus = lastRun?.status ?? null;

  return (
    <>
      <PageHeader
        title="Resumen"
        description="Estado general de la base de datos de Emer."
        actions={
          <>
            <Link href="/products?unclassified=1" className={buttonClasses("secondary", "md")}>
              Sin clasificar
            </Link>
            <Link href="/scraper" className={buttonClasses("primary", "md")}>
              Lanzar scraper
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Marcas" value={formatNumber(brandsCount)} detail="Marcas en catálogo" />

        <StatCard
          label="Productos"
          value={formatNumber(productsCount)}
          detail="Total de productos scrapeados"
        />

        <StatCard
          label="Sin categoría"
          value={formatNumber(unclassifiedCount)}
          tone={unclassifiedCount > 0 ? "error" : "ok"}
          detail={
            unclassifiedCount > 0
              ? "Productos pendientes de clasificar"
              : "Todo el catálogo está clasificado"
          }
        />

        <div className="border-ink bg-paper shadow-hard flex flex-col gap-2 border-2 p-4 sm:col-span-2">
          <span className="label-caps text-ink/70">Último scrape</span>

          {lastRun && lastRunStatus ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl leading-none font-bold tracking-tighter">
                  {formatDateTime(lastRun.started_at)}
                </span>
                <ScrapeStatusBadge status={lastRunStatus} />
              </div>

              <dl className="text-ink/70 mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                <div>
                  <dt className="label-caps text-ink/50">Marca</dt>
                  <dd className="truncate">{lastRun.brand?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="label-caps text-ink/50">Fin</dt>
                  <dd>{formatDateTime(lastRun.finished_at)}</dd>
                </div>
                <div>
                  <dt className="label-caps text-ink/50">Encontrados</dt>
                  <dd>{formatNumber(lastRun.products_found)}</dd>
                </div>
                <div>
                  <dt className="label-caps text-ink/50">Guardados</dt>
                  <dd>{formatNumber(lastRun.products_upserted)}</dd>
                </div>
              </dl>

              {lastRun.error_message ? (
                <p className="border-error text-error mt-1 border-2 p-2 text-xs">
                  {lastRun.error_message}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-ink/60 text-sm">Todavía no hay ningún scrape registrado.</p>
          )}
        </div>

        <StatCard
          label="Runs con error (24 h)"
          value={formatNumber(failedRuns24h)}
          tone={failedRuns24h > 0 ? "error" : "ok"}
          detail={
            failedRuns24h > 0
              ? "Revisa los errores en la sección Scraper"
              : "Sin errores en las últimas 24 horas"
          }
        />
      </div>
    </>
  );
}
