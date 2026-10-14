import { PageHeader } from "@/components/layout/PageHeader";
import { LaunchAllButton } from "@/components/scraper/LaunchAllButton";
import { ProblemBrands } from "@/components/scraper/ProblemBrands";
import { ScrapesFilters } from "@/components/scrapes/ScrapesFilters";
import { ScrapesRealtime } from "@/components/scrapes/ScrapesRealtime";
import { ScrapesTable } from "@/components/scrapes/ScrapesTable";
import { StatCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getBrandsForFilter, getProblemBrands } from "@/lib/queries/scraper";
import { getScrapeRunCounts, getScrapeRunsAdmin } from "@/lib/queries/scrapes";
import { parseScrapeRunsFilters, type RawSearchParams } from "@/lib/scrape-filters";
import { formatNumber } from "@/lib/utils";
import { SCRAPES_LIMIT } from "@/types/scrapes";

export const dynamic = "force-dynamic";

export const metadata = { title: "Scraper · Emer Admin" };

export default async function ScraperPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseScrapeRunsFilters(await searchParams);

  const [runsResult, countsResult, brandsResult, problemsResult] = await Promise.all([
    getScrapeRunsAdmin(filters),
    getScrapeRunCounts(),
    getBrandsForFilter(),
    getProblemBrands(),
  ]);

  const brands = brandsResult.ok ? brandsResult.data : [];
  const counts = countsResult.ok ? countsResult.data : null;
  const hasRunning = (counts?.running ?? 0) > 0;
  const now = new Date().toISOString();

  return (
    <>
      <PageHeader
        title="Scraper"
        description="Lanza el flujo de n8n y sigue las ejecuciones marca a marca en tiempo real."
        actions={
          <>
            <ScrapesRealtime hasRunning={hasRunning} />
            <LaunchAllButton brandsCount={brands.length} />
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {counts ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="En curso" value={formatNumber(counts.running)} tone="progress" />
            <StatCard
              label="Finalizadas"
              value={formatNumber(counts.success + counts.partial)}
              tone="ok"
              detail={`${formatNumber(counts.partial)} con avisos`}
            />
            <StatCard label="Con error" value={formatNumber(counts.error)} tone="error" />
            <StatCard
              label="Bloqueadas"
              value={formatNumber(counts.stuck)}
              detail="Más de 30 min en curso"
            />
          </div>
        ) : (
          <p className="border-error bg-paper text-error border-2 p-3 text-xs">
            No se han podido calcular los contadores: {!countsResult.ok ? countsResult.error : ""}
          </p>
        )}

        {problemsResult.ok ? (
          <ProblemBrands brands={problemsResult.data} />
        ) : (
          <p className="border-error bg-paper text-error border-2 p-3 text-xs">
            No se han podido calcular las marcas con problemas: {problemsResult.error}
          </p>
        )}

        {!runsResult.ok ? (
          <EmptyState
            tone="error"
            title="No se han podido cargar las ejecuciones"
            description={runsResult.error}
          />
        ) : (
          <>
            <ScrapesFilters
              filters={filters}
              brands={brands}
              total={runsResult.data.length}
              limit={SCRAPES_LIMIT}
            />

            {runsResult.data.length === 0 ? (
              <EmptyState
                title="Sin ejecuciones"
                description={
                  filters.brand || filters.status
                    ? "Ninguna ejecución coincide con los filtros."
                    : "Todavía no se ha lanzado ningún scrape."
                }
              />
            ) : (
              <ScrapesTable runs={runsResult.data} now={now} />
            )}
          </>
        )}
      </div>
    </>
  );
}
