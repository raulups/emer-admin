"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { RunStatusBadge } from "@/components/scraper/RunStatusBadge";
import { useScraperStatus } from "@/components/scraper/ScraperStatusProvider";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { launchScraper } from "@/lib/scraper-client";
import { formatDateTime, formatDuration, formatNumber, formatRelativeTime } from "@/lib/utils";
import { RUNS_POLL_MS, type ScrapeRunRow } from "@/types/scraper";
import type { Uuid } from "@/types/db";

/**
 * Cuanto se sigue mirando tras lanzar, aunque todavia no haya aparecido el
 * run: n8n tarda un momento en crear la fila en `scrape_runs`.
 */
const GRACE_MS = 60_000;

export interface BrandScrapeProgressProps {
  brandId: Uuid;
  brandName: string;
  /** Ultimo run conocido al renderizar en el servidor. */
  initialRun: ScrapeRunRow | null;
}

/** Boton de lanzar + seguimiento en vivo del scrape de una marca. */
export function BrandScrapeProgress({ brandId, brandName, initialRun }: BrandScrapeProgressProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { refresh: refreshSidebar } = useScraperStatus();

  const [run, setRun] = useState<ScrapeRunRow | null>(initialRun);
  const [launching, setLaunching] = useState(false);
  const [graceUntil, setGraceUntil] = useState(0);

  // El bucle de polling consulta estos valores sin re-suscribirse.
  const statusRef = useRef<string | null>(initialRun?.status ?? null);
  const graceRef = useRef(0);

  const isRunning = run?.status === "running" && !run.stale;

  async function launch() {
    setLaunching(true);
    try {
      const result = await launchScraper(brandId);

      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }

      showToast(`Scraper lanzado para ${brandName}.`, "ok");
      graceRef.current = Date.now() + GRACE_MS;
      setGraceUntil(graceRef.current);
      refreshSidebar();
    } finally {
      setLaunching(false);
    }
  }

  useEffect(() => {
    const active = isRunning || Date.now() < graceUntil;
    if (!active) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const response = await fetch(`/api/scraper/runs?mode=latest&brand=${brandId}`, {
          cache: "no-store",
        });
        const payload: unknown = await response.json();

        if (!cancelled && payload && typeof payload === "object" && "ok" in payload && payload.ok) {
          const next = ((payload as { run?: ScrapeRunRow | null }).run ??
            null) as ScrapeRunRow | null;

          const wasRunning = statusRef.current === "running";
          const nowRunning = next?.status === "running";

          // En cuanto aparece el run, la ventana de cortesia ya no hace falta.
          if (nowRunning && graceRef.current !== 0) {
            graceRef.current = 0;
            setGraceUntil(0);
          }

          setRun(next);
          statusRef.current = next?.status ?? null;

          if (wasRunning && next && !nowRunning) {
            // Ha terminado: avisamos y recargamos los datos de la pagina.
            const ok = next.status === "success";
            showToast(
              ok
                ? `Scrape de ${brandName} terminado: ${formatNumber(next.products_upserted)} productos guardados.`
                : `El scrape de ${brandName} ha terminado con estado "${next.status}".`,
              ok ? "ok" : "error",
            );
            graceRef.current = 0;
            setGraceUntil(0);
            refreshSidebar();
            router.refresh();
            return;
          }
        }
      } catch {
        // Fallo puntual de red: se reintenta en el siguiente ciclo.
      }

      if (cancelled) return;

      const keepGoing = statusRef.current === "running" || Date.now() < graceRef.current;
      if (keepGoing) timer = setTimeout(tick, RUNS_POLL_MS);
    };

    timer = setTimeout(tick, RUNS_POLL_MS);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isRunning, graceUntil, brandId, brandName, router, showToast, refreshSidebar]);

  const waiting = graceUntil > 0 && !isRunning;

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" onClick={launch} loading={launching} disabled={isRunning}>
        {isRunning ? "Scrape en curso…" : "Lanzar scraper"}
      </Button>

      {isRunning || waiting ? (
        <div className="border-ink bg-progress flex flex-col gap-1 border-2 p-2 text-xs">
          {waiting ? (
            <span className="font-bold">Esperando a que n8n cree la ejecución…</span>
          ) : (
            <>
              <span className="flex items-center gap-2 font-bold">
                <RunStatusBadge status="running" />
                Empezó {formatRelativeTime(run?.started_at)}
              </span>
              <span>
                Lleva {formatDuration(run?.started_at, new Date().toISOString())} · se refresca cada{" "}
                {RUNS_POLL_MS / 1000} s
              </span>
            </>
          )}
        </div>
      ) : run ? (
        <div className="text-ink/60 flex flex-wrap items-center gap-2 text-xs">
          <RunStatusBadge status={run.status} stale={run.stale} />
          <span title={formatDateTime(run.started_at)}>
            Último scrape {formatRelativeTime(run.started_at)}
          </span>
          {run.products_upserted !== null ? (
            <span>· {formatNumber(run.products_upserted)} guardados</span>
          ) : null}
        </div>
      ) : (
        <span className="text-ink/50 text-xs">Esta marca no se ha scrapeado nunca.</span>
      )}
    </div>
  );
}
