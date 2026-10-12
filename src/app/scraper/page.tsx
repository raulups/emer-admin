import { PageHeader } from "@/components/layout/PageHeader";
import { LaunchAllButton } from "@/components/scraper/LaunchAllButton";
import { ProblemBrands } from "@/components/scraper/ProblemBrands";
import { RunsMonitor } from "@/components/scraper/RunsMonitor";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getBrandsForFilter, getProblemBrands, getScrapeRuns } from "@/lib/queries/scraper";

export const dynamic = "force-dynamic";

export const metadata = { title: "Scraper · Emer Admin" };

export default async function ScraperPage() {
  const [runsResult, brandsResult, problemsResult] = await Promise.all([
    getScrapeRuns(),
    getBrandsForFilter(),
    getProblemBrands(),
  ]);

  if (!runsResult.ok) {
    return (
      <>
        <PageHeader title="Scraper" />
        <EmptyState
          tone="error"
          title="No se han podido cargar las ejecuciones"
          description={runsResult.error}
        />
      </>
    );
  }

  const brands = brandsResult.ok ? brandsResult.data : [];

  return (
    <>
      <PageHeader
        title="Scraper"
        description="Lanza el flujo de n8n y sigue las ejecuciones en tiempo real."
        actions={<LaunchAllButton brandsCount={brands.length} />}
      />

      <div className="flex flex-col gap-4">
        {problemsResult.ok ? (
          <ProblemBrands brands={problemsResult.data} />
        ) : (
          <p className="border-error bg-paper text-error border-2 p-3 text-xs">
            No se han podido calcular las marcas con problemas: {problemsResult.error}
          </p>
        )}

        <Card>
          <CardHeader title="Últimas ejecuciones" />
          <div className="p-4">
            <RunsMonitor initial={runsResult.data} brands={brands} />
          </div>
        </Card>
      </div>
    </>
  );
}
