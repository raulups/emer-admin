import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { RunProductsFilters } from "@/components/scrapes/RunProductsFilters";
import { RunProductsPagination } from "@/components/scrapes/RunProductsPagination";
import { RunProductsTable } from "@/components/scrapes/RunProductsTable";
import { ScrapeStateBadge } from "@/components/scrapes/ScrapeStateBadge";
import { buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { parseRunProductsFilters, UUID, type RawSearchParams } from "@/lib/scrape-filters";
import { getRunProducts, getScrapeRunAdmin } from "@/lib/queries/scrapes";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/utils";
import { errorCodeLabel } from "@/types/scrapes";

export const dynamic = "force-dynamic";

export const metadata = { title: "Detalle de scrape · Emer Admin" };

function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="label-caps text-ink/60">{label}</dt>
      <dd className="text-sm font-bold">{children}</dd>
    </div>
  );
}

export default async function ScrapeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const filters = parseRunProductsFilters(await searchParams);

  const [runResult, productsResult] = await Promise.all([
    getScrapeRunAdmin(id),
    getRunProducts(id, filters),
  ]);

  const back = (
    <Link href="/scraper" className={buttonClasses("secondary", "md")}>
      ← Volver al scraper
    </Link>
  );

  if (!runResult.ok) {
    return (
      <>
        <PageHeader title="Scrape" actions={back} />
        <EmptyState
          tone="error"
          title="No se ha podido cargar la ejecución"
          description={runResult.error}
        />
      </>
    );
  }

  const run = runResult.data;
  if (!run) notFound();

  return (
    <>
      <PageHeader
        title={run.brand_name ?? "Scrape"}
        description={`Ejecución del ${formatDateTime(run.started_at)}`}
        actions={back}
      />

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Resumen" />
          <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Estado">
              <ScrapeStateBadge status={run.status} />
            </SummaryItem>
            <SummaryItem label="Marca">
              {run.brand_id ? (
                <Link href={`/brands/${run.brand_id}`} className="hover:underline">
                  {run.brand_name ?? "(marca borrada)"}
                </Link>
              ) : (
                "—"
              )}
            </SummaryItem>
            <SummaryItem label="Inicio">{formatDateTime(run.started_at)}</SummaryItem>
            <SummaryItem label="Fin">{formatDateTime(run.finished_at)}</SummaryItem>
            <SummaryItem label="Duración">
              {formatDuration(run.started_at, run.finished_at)}
            </SummaryItem>
            <SummaryItem label="Encontrados">{formatNumber(run.products_found)}</SummaryItem>
            <SummaryItem label="Guardados">{formatNumber(run.products_upserted)}</SummaryItem>
            <SummaryItem label="Creados / modificados">
              {productsResult.ok
                ? `${formatNumber(productsResult.data.createdCount)} / ${formatNumber(productsResult.data.updatedCount)}`
                : "—"}
            </SummaryItem>
          </dl>
        </Card>

        {run.status === "error" || run.error_message ? (
          <div className="border-error bg-paper shadow-hard border-2 p-4">
            <p className="label-caps text-error">
              {run.status === "error" ? errorCodeLabel(run.error_code) : "Avisos"}
              {run.error_code ? ` · ${run.error_code}` : ""}
            </p>
            {run.error_message ? (
              <pre className="text-error mt-2 overflow-x-auto text-xs whitespace-pre-wrap">
                {run.error_message}
              </pre>
            ) : null}
          </div>
        ) : null}

        <Card>
          <CardHeader title="Productos creados y modificados" />
          {!productsResult.ok ? (
            <p className="text-error p-4 text-xs">
              No se han podido cargar los productos: {productsResult.error}
            </p>
          ) : (
            <>
              <RunProductsFilters
                runId={run.id}
                filters={filters}
                total={productsResult.data.total}
              />
              {productsResult.data.items.length === 0 ? (
                <p className="text-ink/60 p-8 text-center text-sm">
                  {filters.action || filters.q
                    ? "Ningún producto coincide con los filtros."
                    : "Esta ejecución no ha creado ni modificado productos."}
                </p>
              ) : (
                <>
                  <RunProductsTable items={productsResult.data.items} />
                  <RunProductsPagination
                    runId={run.id}
                    page={productsResult.data}
                    filters={filters}
                  />
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  );
}
