import Link from "next/link";

import { ColorSwatch } from "@/components/brands/ColorSwatch";
import { RemoteImage } from "@/components/brands/RemoteImage";
import { TagBadges } from "@/components/brands/TagBadges";
import { ScrapeStatusBadge } from "@/components/ScrapeStatusBadge";
import { displayUrl } from "@/lib/url";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import type { BrandListItem } from "@/types/brands";

function CountCell({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number | null;
  alert?: boolean;
}) {
  return (
    <div className="border-ink flex flex-col border-2 px-2 py-1">
      <span className="text-ink/50 text-[9px] font-bold tracking-widest uppercase">{label}</span>
      <span
        className={
          alert && (value ?? 0) > 0
            ? "text-error text-base leading-tight font-bold"
            : "text-base leading-tight font-bold"
        }
      >
        {value === null ? "—" : formatNumber(value)}
      </span>
    </div>
  );
}

export function BrandCard({ brand }: { brand: BrandListItem }) {
  return (
    <article className="press border-ink bg-paper flex flex-col border-2">
      <Link href={`/brands/${brand.id}`} className="block">
        <RemoteImage
          src={brand.img}
          alt={`Imagen de ${brand.name}`}
          fallbackLabel="Sin imagen"
          className="border-ink h-28 w-full border-b-2"
        />
      </Link>

      <div className="border-ink flex items-start gap-3 border-b-2 p-3">
        <RemoteImage
          src={brand.logo}
          alt={`Logo de ${brand.name}`}
          fallbackLabel="Logo"
          fit="contain"
          className="border-ink size-11 shrink-0 border-2 p-0.5"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/brands/${brand.id}`}
            className="block truncate text-base leading-tight font-bold tracking-tight uppercase hover:underline"
          >
            {brand.name}
          </Link>
          {brand.url ? (
            <a
              href={brand.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-ink/60 decoration-ink/30 hover:decoration-ink block truncate text-xs underline"
            >
              {displayUrl(brand.url)} ↗
            </a>
          ) : (
            <span className="text-ink/40 text-xs">Sin tienda</span>
          )}
          <div className="mt-1.5">
            <ColorSwatch color={brand.color} />
          </div>
        </div>
      </div>

      <div className="border-ink border-b-2 px-3 py-2">
        <TagBadges tags={brand.tags} />
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        <CountCell label="Productos" value={brand.productsCount} />
        <CountCell label="Sin categoría" value={brand.unclassifiedCount} alert />
      </div>

      <div className="border-ink mt-auto flex items-center justify-between gap-2 border-t-2 px-3 py-2">
        {brand.lastRun ? (
          <>
            <ScrapeStatusBadge status={brand.lastRun.status} />
            <span className="text-ink/60 truncate text-xs">
              {formatRelativeTime(brand.lastRun.started_at)}
            </span>
          </>
        ) : (
          <span className="text-ink/40 text-xs">Sin scrapes</span>
        )}
      </div>
    </article>
  );
}
