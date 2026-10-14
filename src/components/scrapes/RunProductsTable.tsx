import Link from "next/link";

import { ChangesDiff, parseChanges } from "@/components/scrapes/ChangesDiff";
import { Badge } from "@/components/ui/Badge";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { RUN_PRODUCT_ACTION_LABELS, type ScrapeRunProductRow } from "@/types/scrapes";

function changesSummary(row: ScrapeRunProductRow): string | null {
  const entries = parseChanges(row.changes);
  if (entries === null) return "Ver cambios";
  if (entries.length === 0) return null;
  return entries.length === 1 ? "Ver 1 cambio" : `Ver ${entries.length} cambios`;
}

export function RunProductsTable({ items }: { items: ScrapeRunProductRow[] }) {
  return (
    <TableWrapper className="border-0 shadow-none">
      <Table>
        <THead>
          <TR>
            <TH>Producto</TH>
            <TH>ID externo</TH>
            <TH>Acción</TH>
            <TH>Cambios</TH>
          </TR>
        </THead>
        <TBody>
          {items.map((row) => {
            const summary = changesSummary(row);
            return (
              <TR key={row.id}>
                <TD className="align-top font-bold">
                  {row.product_id ? (
                    <Link href={`/products/${row.product_id}`} className="hover:underline">
                      {row.name ?? "(sin nombre)"}
                    </Link>
                  ) : (
                    (row.name ?? "(sin nombre)")
                  )}
                </TD>
                <TD className="text-ink/70 align-top text-xs whitespace-nowrap">
                  {row.external_id ?? "—"}
                </TD>
                <TD className="align-top whitespace-nowrap">
                  <Badge tone={row.action === "created" ? "ok" : "muted"}>
                    {RUN_PRODUCT_ACTION_LABELS[row.action] ?? row.action}
                  </Badge>
                </TD>
                <TD className="align-top">
                  {summary ? (
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-bold uppercase underline select-none">
                        <span className="group-open:hidden">{summary}</span>
                        <span className="hidden group-open:inline">Ocultar</span>
                      </summary>
                      <div className="mt-2">
                        <ChangesDiff changes={row.changes} />
                      </div>
                    </details>
                  ) : (
                    <span className="text-ink/30 text-xs">—</span>
                  )}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </TableWrapper>
  );
}
