"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { cn, formatNumber, formatPrice } from "@/lib/utils";
import type { ProductSize } from "@/types/db";

/** Etiqueta visible de una talla: normalizada si existe, si no la original. */
function sizeLabel(size: ProductSize): string {
  return size.size_normalized?.trim() || size.size_label?.trim() || "—";
}

export function SizesPanel({ sizes, currency }: { sizes: ProductSize[]; currency: string | null }) {
  const [expanded, setExpanded] = useState(false);

  if (sizes.length === 0) {
    return <p className="text-ink/50 text-sm">Este producto no tiene tallas registradas.</p>;
  }

  const available = sizes.filter((size) => size.available === true).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {sizes.map((size) => {
          const inStock = size.available === true;
          return (
            <span
              key={size.id}
              title={inStock ? "Con stock" : "Sin stock"}
              className={cn(
                "border-2 px-2 py-1 text-xs font-bold tracking-wide uppercase",
                inStock
                  ? "border-ink bg-paper text-ink"
                  : "border-ink/30 bg-cream text-ink/40 line-through",
              )}
            >
              {sizeLabel(size)}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-ink/60 text-xs">
          <span className={available === 0 ? "text-error font-bold" : "text-ink font-bold"}>
            {formatNumber(available)}
          </span>{" "}
          con stock de {formatNumber(sizes.length)}
        </p>
        <Button variant="secondary" size="sm" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Ocultar variantes" : "Ver variantes"}
        </Button>
      </div>

      {expanded ? (
        <TableWrapper className="shadow-none">
          <Table>
            <THead>
              <TR>
                <TH>Talla</TH>
                <TH>variant_id</TH>
                <TH>size_label</TH>
                <TH>SKU</TH>
                <TH className="text-right">Precio</TH>
                <TH className="text-right">Compare at</TH>
                <TH className="text-right">Stock</TH>
                <TH>Estado</TH>
              </TR>
            </THead>
            <TBody>
              {sizes.map((size) => (
                <TR key={size.id}>
                  <TD className="font-bold">{sizeLabel(size)}</TD>
                  <TD className="font-mono text-[11px]">{size.variant_id ?? "—"}</TD>
                  <TD className="text-xs">{size.size_label ?? "—"}</TD>
                  <TD className="font-mono text-[11px]">{size.sku ?? "—"}</TD>
                  <TD className="text-right">
                    {size.price === null ? "—" : formatPrice(size.price, currency)}
                  </TD>
                  <TD className="text-right">
                    {size.compare_at_price === null
                      ? "—"
                      : formatPrice(size.compare_at_price, currency)}
                  </TD>
                  <TD className="text-right">
                    {size.stock_quantity === null ? "—" : formatNumber(size.stock_quantity)}
                  </TD>
                  <TD>
                    <span
                      className={cn(
                        "text-xs font-bold",
                        size.available === true ? "text-ok" : "text-error",
                      )}
                    >
                      {size.stock_status === "in_stock"
                        ? "En stock"
                        : size.stock_status === "out_of_stock"
                          ? "Agotada"
                          : "—"}
                    </span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrapper>
      ) : null}
    </div>
  );
}
