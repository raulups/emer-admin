"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ScrapeStateBadge } from "@/components/scrapes/ScrapeStateBadge";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { cn, formatDateTime, formatDuration, formatNumber } from "@/lib/utils";
import {
  errorCodeLabel,
  hasDetail,
  type ScrapeRunAdminRow,
  type ScrapeRunState,
} from "@/types/scrapes";

export interface ScrapesTableProps {
  runs: ScrapeRunAdminRow[];
  now: string;
}

const ROW_TONES: Record<ScrapeRunState, string> = {
  running: "bg-progress/15",
  success: "bg-ok/10",
  partial: "bg-[#E07B29]/15",
  error: "bg-error/10",
  stuck: "bg-ink/5",
};

function runDuration(run: ScrapeRunAdminRow, now: string): string {
  if (run.finished_at) return formatDuration(run.started_at, run.finished_at);
  if (run.status === "running" || run.status === "stuck") {
    return `${formatDuration(run.started_at, now)}…`;
  }
  return "—";
}

export function ScrapesTable({ runs, now }: ScrapesTableProps) {
  const router = useRouter();

  return (
    <TableWrapper>
      <Table>
        <THead>
          <TR>
            <TH>Marca</TH>
            <TH>Estado</TH>
            <TH>Inicio</TH>
            <TH>Duración</TH>
            <TH className="text-right">Encontrados</TH>
            <TH className="text-right">Guardados</TH>
            <TH>Error</TH>
            <TH>
              <span className="sr-only">Detalle</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {runs.map((run) => {
            const clickable = hasDetail(run.status);
            const href = `/scraper/${run.id}`;
            return (
              <TR
                key={run.id}
                interactive={clickable}
                onClick={clickable ? () => router.push(href) : undefined}
                className={cn(ROW_TONES[run.status])}
              >
                <TD className="font-bold whitespace-nowrap">
                  {run.brand_name ?? <span className="text-ink/40">(marca borrada)</span>}
                </TD>
                <TD className="whitespace-nowrap">
                  <ScrapeStateBadge status={run.status} />
                </TD>
                <TD className="whitespace-nowrap">{formatDateTime(run.started_at)}</TD>
                <TD className="whitespace-nowrap">{runDuration(run, now)}</TD>
                <TD className="text-right">{formatNumber(run.products_found)}</TD>
                <TD className="text-right">{formatNumber(run.products_upserted)}</TD>
                <TD className="max-w-md">
                  {run.status === "error" || run.error_message ? (
                    <div className="flex flex-col gap-0.5">
                      {run.status === "error" ? (
                        <span className="text-error text-xs font-bold uppercase">
                          {errorCodeLabel(run.error_code)}
                        </span>
                      ) : null}
                      {run.error_message ? (
                        <span
                          className="text-ink/70 line-clamp-2 text-xs"
                          title={run.error_message}
                        >
                          {run.error_message}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-ink/30 text-xs">—</span>
                  )}
                </TD>
                <TD className="text-right whitespace-nowrap">
                  {clickable ? (
                    <Link
                      href={href}
                      onClick={(event) => event.stopPropagation()}
                      className="text-xs font-bold uppercase underline"
                    >
                      Ver
                    </Link>
                  ) : null}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </TableWrapper>
  );
}
