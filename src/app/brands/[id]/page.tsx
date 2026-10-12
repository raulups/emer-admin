import Link from "next/link";
import { notFound } from "next/navigation";

import { ColorSwatch } from "@/components/brands/ColorSwatch";
import { DeleteBrandButton } from "@/components/brands/DeleteBrandButton";
import { DistributionBars } from "@/components/brands/DistributionBars";
import { RemoteImage } from "@/components/brands/RemoteImage";
import { RunsHistory } from "@/components/brands/RunsHistory";
import { BrandScrapeProgress } from "@/components/scraper/BrandScrapeProgress";
import { TagBadges } from "@/components/brands/TagBadges";
import { buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getBrandDetail } from "@/lib/queries/brands";
import { getLatestRunForBrand } from "@/lib/queries/scraper";
import { displayUrl } from "@/lib/url";
import { formatDate, formatNumber } from "@/lib/utils";
import { BRAND_TAG_DESCRIPTIONS } from "@/lib/validation/brand";

export const dynamic = "force-dynamic";

function SummaryItem({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="border-ink flex flex-col gap-0.5 border-2 p-3">
      <span className="label-caps text-ink/60">{label}</span>
      <span
        className={
          alert && value > 0
            ? "text-error text-3xl leading-none font-bold tracking-tighter"
            : "text-3xl leading-none font-bold tracking-tighter"
        }
      >
        {formatNumber(value)}
      </span>
    </div>
  );
}

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, latestRunResult] = await Promise.all([
    getBrandDetail(id),
    getLatestRunForBrand(id),
  ]);

  if (!result.ok) {
    return (
      <EmptyState
        tone="error"
        title="No se ha podido cargar la marca"
        description={result.error}
        action={
          <Link href="/brands" className={buttonClasses("secondary", "md")}>
            Volver a marcas
          </Link>
        }
      />
    );
  }

  if (!result.data) notFound();

  const { brand, counts, byCategory, byGender, runs, warning } = result.data;

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera */}
      <div className="border-ink bg-paper shadow-hard border-2">
        <RemoteImage
          src={brand.img}
          alt={`Imagen de ${brand.name}`}
          fallbackLabel="Sin imagen de portada"
          className="border-ink h-40 w-full border-b-2"
        />

        <div className="flex flex-wrap items-start justify-between gap-4 p-4">
          <div className="flex min-w-0 items-start gap-4">
            <RemoteImage
              src={brand.logo}
              alt={`Logo de ${brand.name}`}
              fallbackLabel="Logo"
              fit="contain"
              className="border-ink size-20 shrink-0 border-2 p-1"
            />

            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex items-baseline gap-3">
                <Link href="/brands" className="text-ink/50 text-xs uppercase hover:underline">
                  Marcas /
                </Link>
              </div>
              <h1 className="title-xl break-words">{brand.name}</h1>

              {brand.url ? (
                <a
                  href={brand.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="decoration-ink/30 hover:decoration-ink text-sm underline"
                >
                  {displayUrl(brand.url)} ↗
                </a>
              ) : (
                <span className="text-ink/40 text-sm">Sin tienda</span>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <TagBadges tags={brand.tags} />
                <ColorSwatch color={brand.color} />
              </div>

              <dl className="text-ink/60 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                <div className="flex gap-1.5">
                  <dt className="label-caps text-ink/50">Fundada</dt>
                  <dd>{brand.founded_year ?? "—"}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="label-caps text-ink/50">Estilo</dt>
                  <dd>{brand.style ?? "—"}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="label-caps text-ink/50">Alta</dt>
                  <dd>{formatDate(brand.created_at)}</dd>
                </div>
              </dl>

              {brand.tags.length > 0 ? (
                <ul className="text-ink/50 flex flex-col gap-0.5 text-[11px]">
                  {brand.tags.map((tag) => (
                    <li key={tag}>
                      <span className="font-bold uppercase">{tag}</span> ·{" "}
                      {BRAND_TAG_DESCRIPTIONS[tag]}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <Link href={`/brands/${brand.id}/edit`} className={buttonClasses("primary", "md")}>
              Editar
            </Link>
            <BrandScrapeProgress
              brandId={brand.id}
              brandName={brand.name}
              initialRun={latestRunResult.ok ? latestRunResult.data : null}
            />
            <Link href={`/products?brand=${brand.id}`} className={buttonClasses("secondary", "md")}>
              Ver productos
            </Link>
            <DeleteBrandButton
              brandId={brand.id}
              brandName={brand.name}
              productsCount={counts.total}
            />
          </div>
        </div>
      </div>

      {warning ? (
        <p className="border-error bg-paper text-error border-2 p-3 text-xs">{warning}</p>
      ) : null}

      {/* Resumen */}
      <Card>
        <CardHeader title="Resumen" />
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryItem label="Productos" value={counts.total} />
          <SummaryItem label="Disponibles" value={counts.available} />
          <SummaryItem label="En rebajas" value={counts.onSale} />
          <SummaryItem label="Sin categoría" value={counts.unclassified} alert />
        </div>
      </Card>

      {/* Repartos */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Reparto por categoría" />
          <div className="p-4">
            <DistributionBars
              items={byCategory}
              total={counts.total}
              emptyLabel="Esta marca todavía no tiene productos clasificados."
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Reparto por género" />
          <div className="p-4">
            <DistributionBars
              items={byGender}
              total={counts.total}
              emptyLabel="Esta marca todavía no tiene productos."
            />
          </div>
        </Card>
      </div>

      {/* Historial de scrapes */}
      <Card>
        <CardHeader
          title="Últimos scrapes"
          actions={
            <Link href="/scraper" className={buttonClasses("secondary", "sm")}>
              Ver todos
            </Link>
          }
        />
        <RunsHistory runs={runs} />
      </Card>
    </div>
  );
}
