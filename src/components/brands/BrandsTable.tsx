"use client";

import Link from "next/link";

import { ColorSwatch } from "@/components/brands/ColorSwatch";
import { QuickTags } from "@/components/brands/QuickTags";
import { RemoteImage } from "@/components/brands/RemoteImage";
import { ScrapeStatusBadge } from "@/components/ScrapeStatusBadge";
import { buttonClasses } from "@/components/ui/Button";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { displayUrl } from "@/lib/url";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import type { BrandListItem } from "@/types/brands";
import type { Uuid } from "@/types/db";

export function BrandsTable({
  brands,
  onEdit,
}: {
  brands: BrandListItem[];
  onEdit: (id: Uuid) => void;
}) {
  return (
    <TableWrapper>
      <Table>
        <THead>
          <TR>
            <TH>Marca</TH>
            <TH>Tienda</TH>
            <TH>Color</TH>
            <TH>Tags · clic para cambiar</TH>
            <TH className="text-right">Prod.</TH>
            <TH className="text-right">Sin cat.</TH>
            <TH>Último scrape</TH>
            <TH className="text-right">Acciones</TH>
          </TR>
        </THead>
        <TBody>
          {brands.map((brand) => (
            <TR key={brand.id} interactive>
              <TD>
                <button
                  type="button"
                  onClick={() => onEdit(brand.id)}
                  className="flex cursor-pointer items-center gap-2 text-left"
                >
                  <RemoteImage
                    src={brand.logo}
                    alt={`Logo de ${brand.name}`}
                    fallbackLabel="—"
                    fit="contain"
                    className="border-line size-7 shrink-0 border"
                  />
                  <span className="font-semibold tracking-tight hover:underline">{brand.name}</span>
                </button>
              </TD>

              <TD>
                {brand.url ? (
                  <a
                    href={brand.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="decoration-ink/30 hover:decoration-ink text-xs underline"
                  >
                    {displayUrl(brand.url)} ↗
                  </a>
                ) : (
                  <span className="text-error text-xs font-semibold">Sin tienda</span>
                )}
              </TD>

              <TD>
                <ColorSwatch color={brand.color} showValue={false} />
              </TD>

              <TD>
                <QuickTags brandId={brand.id} brandName={brand.name} tags={brand.tags} size="sm" />
              </TD>

              <TD className="text-right font-semibold">
                {brand.productsCount === null ? "—" : formatNumber(brand.productsCount)}
              </TD>

              <TD className="text-right font-semibold">
                {brand.unclassifiedCount === null ? (
                  "—"
                ) : (
                  <span className={brand.unclassifiedCount > 0 ? "text-error" : undefined}>
                    {formatNumber(brand.unclassifiedCount)}
                  </span>
                )}
              </TD>

              <TD>
                {brand.lastRun ? (
                  <div className="flex items-center gap-2">
                    <ScrapeStatusBadge status={brand.lastRun.status} />
                    <span className="text-ink/60 text-xs whitespace-nowrap">
                      {formatRelativeTime(brand.lastRun.started_at)}
                    </span>
                  </div>
                ) : (
                  <span className="text-ink/40 text-xs">Sin scrapes</span>
                )}
              </TD>

              <TD className="text-right">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(brand.id)}
                    className={buttonClasses("primary", "sm")}
                  >
                    Editar
                  </button>
                  <Link href={`/brands/${brand.id}`} className={buttonClasses("secondary", "sm")}>
                    Ficha
                  </Link>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableWrapper>
  );
}
