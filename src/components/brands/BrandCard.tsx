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
      <span className="text-ink/50 text-[9px] font-bold tracking-widest uppercase">{label}</span>
      <span
        className={cn(
          "text-lg leading-tight font-bold tracking-tight",
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
    <article className="group border-ink bg-paper shadow-hard hover:shadow-hard-lg flex flex-col border-2 transition-shadow duration-[120ms]">
      <div className="border-ink relative border-b-2">
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

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end gap-1 p-2 opacity-0 transition-opacity duration-[120ms] group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
          <button type="button" onClick={onEdit} className={buttonClasses("primary", "sm")}>
            Editar
          </button>
          <Link href={`/brands/${brand.id}`} className={buttonClasses("secondary", "sm")}>
            Ficha
          </Link>
        </div>

        {missing.length > 0 ? (
          <span className="bg-progress border-ink absolute bottom-2 left-2 border-2 px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase">
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
          className="border-ink size-12 shrink-0 border-2 p-0.5"
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onEdit}
            className="block max-w-full cursor-pointer truncate text-left text-base leading-tight font-bold tracking-tight uppercase hover:underline"
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
            <span className="text-error text-xs font-bold">Sin tienda</span>
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

      <div className="border-ink divide-ink mt-auto grid grid-cols-3 divide-x-2 border-t-2">
        <Stat label="Productos" value={brand.productsCount} />
        <Stat label="Sin cat." value={brand.unclassifiedCount} alert />
        <div className="flex min-w-0 flex-col justify-center gap-0.5 px-3 py-2">
          {brand.lastRun ? (
            <>
              <ScrapeStatusBadge status={brand.lastRun.status} />
              <span className="text-ink/60 truncate text-[10px]">
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
