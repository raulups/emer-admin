"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useScraperStatus } from "@/components/scraper/ScraperStatusProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { launchScraper } from "@/lib/scraper-client";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import { PROBLEM_REASON_LABELS, type ProblemBrand } from "@/types/scraper";

/** Marcas cuyo último scrape falló, quedó a medias o no dejó productos. */
export function ProblemBrands({ brands }: { brands: ProblemBrand[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { refresh } = useScraperStatus();
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  async function relaunch(brand: ProblemBrand) {
    setLaunchingId(brand.id);
    try {
      const result = await launchScraper(brand.id);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast(`Scraper lanzado para ${brand.name}.`, "ok");
      refresh();
      router.refresh();
    } finally {
      setLaunchingId(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Marcas con problemas"
        actions={
          <span className="text-ink/60 text-xs">
            {formatNumber(brands.length)} {brands.length === 1 ? "marca" : "marcas"}
          </span>
        }
      />

      {brands.length === 0 ? (
        <p className="text-ok p-4 text-sm">
          Ninguna marca con problemas: todas tienen productos y su último scrape fue correcto.
        </p>
      ) : (
        <TableWrapper className="border-0 shadow-none">
          <Table>
            <THead>
              <TR>
                <TH>Marca</TH>
                <TH>Motivo</TH>
                <TH className="text-right">Productos</TH>
                <TH>Último scrape</TH>
                <TH className="text-right">Acción</TH>
              </TR>
            </THead>
            <TBody>
              {brands.map((brand) => (
                <TR key={brand.id}>
                  <TD>
                    <Link href={`/brands/${brand.id}`} className="font-bold hover:underline">
                      {brand.name}
                    </Link>
                  </TD>

                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {brand.reasons.map((reason) => (
                        <Badge
                          key={reason}
                          tone={
                            reason === "error"
                              ? "error"
                              : reason === "partial"
                                ? "progress"
                                : "muted"
                          }
                        >
                          {PROBLEM_REASON_LABELS[reason]}
                        </Badge>
                      ))}
                    </div>
                    {brand.lastRunError ? (
                      <p className="text-error mt-1 max-w-md text-[11px] break-words">
                        {brand.lastRunError}
                      </p>
                    ) : null}
                  </TD>

                  <TD className="text-right font-bold">
                    <span className={brand.productsCount === 0 ? "text-error" : undefined}>
                      {formatNumber(brand.productsCount)}
                    </span>
                  </TD>

                  <TD className="text-ink/60 text-xs whitespace-nowrap">
                    {brand.lastRunAt ? formatRelativeTime(brand.lastRunAt) : "Nunca"}
                  </TD>

                  <TD className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => relaunch(brand)}
                      loading={launchingId === brand.id}
                      disabled={launchingId !== null && launchingId !== brand.id}
                    >
                      Relanzar
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrapper>
      )}
    </Card>
  );
}
