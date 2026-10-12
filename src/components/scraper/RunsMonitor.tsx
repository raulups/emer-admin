"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { RunStatusBadge } from "@/components/scraper/RunStatusBadge";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { cn, formatDateTime, formatDuration, formatNumber, formatRelativeTime } from "@/lib/utils";
import type { Brand } from "@/types/db";
import {
  RUNS_POLL_MS,
  STATUS_FILTER_LABELS,
  STATUS_FILTER_VALUES,
  type RunsResponse,
  type ScrapeRunRow,
  type StatusFilter,
} from "@/types/scraper";

export interface RunsMonitorProps {
  initial: RunsResponse;
  brands: Array<Pick<Brand, "id" | "name">>;
}

/** Duracion de un run: si sigue en curso, cuenta desde el inicio hasta ahora. */
function runDuration(run: ScrapeRunRow): string {
  if (run.finished_at) return formatDuration(run.started_at, run.finished_at);
  if (run.status === "running" && !run.stale) return "en curso…";
  return "—";
}

export function RunsMonitor({ initial, brands }: RunsMonitorProps) {
  const [data, setData] = useState<RunsResponse>(initial);
  const [brandFilter, setBrandFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El bucle lee de refs para no reprogramarse cada vez que llegan datos.
  const activeRef = useRef(initial.activeCount);

  const load = useCallback(async (brand: string, status: StatusFilter) => {
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    if (status !== "all") params.set("status", status);

    const query = params.toString();
    const response = await fetch(`/api/scraper/runs${query ? `?${query}` : ""}`, {
      cache: "no-store",
    });
    const payload: unknown = await response.json();

    if (!payload || typeof payload !== "object" || !("ok" in payload) || !payload.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : `El servidor ha respondido ${response.status}.`;
      throw new Error(message);
    }

    return payload as unknown as RunsResponse;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const next = await load(brandFilter, statusFilter);
        if (cancelled) return;
        activeRef.current = next.activeCount;
        setData(next);
        setError(null);
        setPolling(next.activeCount > 0);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Error al refrescar.");
      }

      if (cancelled) return;
      // Solo se sigue refrescando mientras haya algo realmente en curso.
      if (activeRef.current > 0) timer = setTimeout(tick, RUNS_POLL_MS);
      else setPolling(false);
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [brandFilter, statusFilter, load]);

  const runs = data.runs;

  return (
    <div className="flex flex-col gap-3">
      {/* Filtros */}
      <div className="border-ink bg-paper shadow-hard flex flex-wrap items-end justify-between gap-3 border-2 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Marca"
            value={brandFilter}
            onChange={(event) => setBrandFilter(event.target.value)}
            placeholder="Todas"
            options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
            wrapperClassName="w-56"
          />
          <Select
            label="Estado"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            options={STATUS_FILTER_VALUES.map((value) => ({
              value,
              label: STATUS_FILTER_LABELS[value],
            }))}
            wrapperClassName="w-44"
          />
        </div>

        <div className="text-ink/60 flex items-center gap-3 text-xs">
          {polling ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" />
              Refrescando cada {RUNS_POLL_MS / 1000} s
            </span>
          ) : (
            <span>Sin scrapes en curso</span>
          )}
          <span>
            {formatNumber(runs.length)} {runs.length === 1 ? "ejecución" : "ejecuciones"}
          </span>
        </div>
      </div>

      {error ? (
        <p className="border-error bg-paper text-error border-2 p-3 text-xs">{error}</p>
      ) : null}

      {data.staleCount > 0 ? (
        <p className="border-ink bg-progress border-2 p-3 text-xs">
          Hay {formatNumber(data.staleCount)}{" "}
          {data.staleCount === 1 ? "ejecución marcada" : "ejecuciones marcadas"} como &quot;en
          curso&quot; desde hace rato. Probablemente n8n se detuvo sin cerrarlas: no se tienen en
          cuenta para el refresco automático.
        </p>
      ) : null}

      {/* Tabla */}
      {runs.length === 0 ? (
        <div className="border-ink bg-paper shadow-hard border-2 p-8 text-center">
          <p className="text-ink/60 text-sm">No hay ejecuciones con estos filtros.</p>
        </div>
      ) : (
        <TableWrapper>
          <Table>
            <THead>
              <TR>
                <TH>Estado</TH>
                <TH>Marca</TH>
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
                  <TR
                    key={run.id}
                    className={cn(run.status === "running" && !run.stale && "bg-progress/15")}
                  >
                    <TD>
                      <RunStatusBadge status={run.status} stale={run.stale} />
                    </TD>
                    <TD className="whitespace-nowrap">
                      {run.brandId ? (
                        <Link href={`/brands/${run.brandId}`} className="font-bold hover:underline">
                          {run.brandName ?? "(marca borrada)"}
                        </Link>
                      ) : (
                        <span className="text-ink/40">Todas</span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap">
                      <span title={formatDateTime(run.started_at)}>
                        {formatRelativeTime(run.started_at)}
                      </span>
                    </TD>
                    <TD className="whitespace-nowrap">{runDuration(run)}</TD>
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
      )}
    </div>
  );
}
