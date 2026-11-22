"use client";

import Link from "next/link";

import { ColorSwatch } from "@/components/brands/ColorSwatch";
import { QuickTags } from "@/components/brands/QuickTags";
import { RemoteImage } from "@/components/brands/RemoteImage";
import { ScrapeStatusBadge } from "@/components/ScrapeStatusBadge";
import { buttonClasses } from "@/components/ui/Button";
import { displayUrl } from "@/lib/url";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";
import type { BrandListItem } from "@/types/brands";

function Stat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number | null;
  alert?: boolean;
}) {
  const highlighted = alert && (value ?? 0) > 0;
  return (
    <div className="flex flex-col px-3 py-2">
      <span className="text-ink/50 text-[11px] font-semibold">{label}</span>
      <span
        className={cn(
          "text-lg leading-tight font-semibold tracking-tight",
          highlighted && "text-error",
        )}
      >
        {value === null ? "—" : formatNumber(value)}
      </span>
    </div>
  );
}

export function BrandCard({ brand, onEdit }: { brand: BrandListItem; onEdit: () => void }) {
  const missing = [
    !brand.img_desktop && "imagen",
    !brand.img_mobile && "imagen app",
    !brand.logo && "logo",
  ].filter((item): item is string => typeof item === "string");

  return (
    <article className="group border-line bg-paper flex flex-col overflow-hidden border shadow-sm transition-shadow duration-150 hover:shadow-md">
      <div className="border-line relative border-b">
        <button
          type="button"
          onClick={onEdit}
          className="block w-full cursor-pointer"
          aria-label={`Editar ${brand.name}`}
        >
          <RemoteImage
            src={brand.img_desktop}
            alt={`Imagen de ${brand.name}`}
            fallbackLabel="Sin imagen"
            className="h-32 w-full"
          />
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end gap-1 p-2 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
          <button type="button" onClick={onEdit} className={buttonClasses("primary", "sm")}>
            Editar
          </button>
          <Link href={`/brands/${brand.id}`} className={buttonClasses("secondary", "sm")}>
            Ficha
          </Link>
        </div>

        {missing.length > 0 ? (
          <span className="bg-progress border-line absolute bottom-2 left-2 border px-1.5 py-0.5 text-[11px] font-semibold">
            Falta {missing.join(", ")}
          </span>
        ) : null}
      </div>

      <div className="flex items-start gap-3 p-3">
        <RemoteImage
          src={brand.logo}
          alt={`Logo de ${brand.name}`}
          fallbackLabel="Logo"
          fit="contain"
          className="border-line size-12 shrink-0 border p-0.5"
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onEdit}
            className="block max-w-full cursor-pointer truncate text-left text-base leading-tight font-semibold tracking-tight hover:underline"
          >
            {brand.name}
          </button>
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
            <span className="text-error text-xs font-semibold">Sin tienda</span>
          )}
          <div className="text-ink/60 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <ColorSwatch color={brand.color} />
            {brand.founded_year ? <span>Desde {brand.founded_year}</span> : null}
            {brand.style ? <span className="truncate">{brand.style}</span> : null}
          </div>
        </div>
      </div>

      <div className="px-3 pb-3">
        <QuickTags brandId={brand.id} brandName={brand.name} tags={brand.tags} />
      </div>

      <div className="border-line divide-line mt-auto grid grid-cols-3 divide-x border-t">
        <Stat label="Productos" value={brand.productsCount} />
        <Stat label="Sin cat." value={brand.unclassifiedCount} alert />
        <div className="flex min-w-0 flex-col justify-center gap-0.5 px-3 py-2">
          {brand.lastRun ? (
            <>
              <ScrapeStatusBadge status={brand.lastRun.status} />
              <span className="text-ink/60 truncate text-[11px]">
                {formatRelativeTime(brand.lastRun.started_at)}
              </span>
            </>
          ) : (
            <span className="text-ink/40 text-[11px]">Sin scrapes</span>
          )}
        </div>
      </div>
    </article>
  );
}
