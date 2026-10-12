"use client";

import { useState } from "react";

import { ScrapeStatusBadge } from "@/components/ScrapeStatusBadge";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/utils";
import type { ScrapeRun } from "@/types/db";

/** Historial de ejecuciones con el mensaje de error desplegable. */
export function RunsHistory({ runs }: { runs: ScrapeRun[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (runs.length === 0) {
    return <p className="text-ink/50 p-4 text-sm">Esta marca todavía no se ha scrapeado.</p>;
  }

  return (
    <TableWrapper className="border-0 shadow-none">
      <Table>
        <THead>
          <TR>
            <TH>Estado</TH>
            <TH>Inicio</TH>
            <TH>Duración</TH>
            <TH className="text-right">Encontrados</TH>
            <TH className="text-right">Guardados</TH>
            <TH>Error</TH>
          </TR>
        </THead>
        <TBody>
          {runs.map((run) => {
            const isExpanded = expanded === run.id;
            return (
              <TR key={run.id}>
                <TD>
                  <ScrapeStatusBadge status={run.status} />
                </TD>
                <TD className="whitespace-nowrap">{formatDateTime(run.started_at)}</TD>
                <TD className="whitespace-nowrap">
                  {run.finished_at
                    ? formatDuration(run.started_at, run.finished_at)
                    : run.status === "running"
                      ? "En curso…"
                      : "—"}
                </TD>
                <TD className="text-right">{formatNumber(run.products_found)}</TD>
                <TD className="text-right">{formatNumber(run.products_upserted)}</TD>
                <TD>
                  {run.error_message ? (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : run.id)}
                        aria-expanded={isExpanded}
                        className="text-error cursor-pointer text-left text-xs font-bold uppercase underline"
                      >
                        {isExpanded ? "Ocultar" : "Ver error"}
                      </button>
                      {isExpanded ? (
                        <pre className="border-error bg-cream text-error max-w-xl overflow-x-auto border-2 p-2 text-[11px] whitespace-pre-wrap">
                          {run.error_message}
                        </pre>
                      ) : null}
                    </div>
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
