import Link from "next/link";

import { ColorSwatch } from "@/components/brands/ColorSwatch";
import { RemoteImage } from "@/components/brands/RemoteImage";
import { TagBadges } from "@/components/brands/TagBadges";
import { ScrapeStatusBadge } from "@/components/ScrapeStatusBadge";
import { buttonClasses } from "@/components/ui/Button";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { displayUrl } from "@/lib/url";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import type { BrandListItem } from "@/types/brands";

export function BrandsTable({ brands }: { brands: BrandListItem[] }) {
  return (
    <TableWrapper>
      <Table>
        <THead>
          <TR>
            <TH>Marca</TH>
            <TH>Tienda</TH>
            <TH>Color</TH>
            <TH>Tags</TH>
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
                <div className="flex items-center gap-2">
                  <RemoteImage
                    src={brand.logo}
                    alt={`Logo de ${brand.name}`}
                    fallbackLabel="—"
                    fit="contain"
                    className="border-ink size-7 shrink-0 border-2"
                  />
                  <Link
                    href={`/brands/${brand.id}`}
                    className="font-bold tracking-tight uppercase hover:underline"
                  >
                    {brand.name}
                  </Link>
                </div>
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
                  <span className="text-ink/40 text-xs">—</span>
                )}
              </TD>

              <TD>
                <ColorSwatch color={brand.color} showValue={false} />
              </TD>

              <TD>
                <TagBadges tags={brand.tags} emptyLabel="—" />
              </TD>

              <TD className="text-right font-bold">
                {brand.productsCount === null ? "—" : formatNumber(brand.productsCount)}
              </TD>

              <TD className="text-right font-bold">
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
                  <Link href={`/brands/${brand.id}`} className={buttonClasses("secondary", "sm")}>
                    Ver
                  </Link>
                  <Link
                    href={`/brands/${brand.id}/edit`}
                    className={buttonClasses("secondary", "sm")}
                  >
                    Editar
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
