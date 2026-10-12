import { NextResponse } from "next/server";

import { getLatestRunForBrand, getRunningCounts, getScrapeRuns } from "@/lib/queries/scraper";
import { SCRAPE_STATUSES, type ScrapeStatus } from "@/types/db";
import { RUNS_LIMIT } from "@/types/scraper";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/scraper/runs
 *
 * Fuente del polling del panel. Parametros:
 *  - `brand`    uuid de marca (filtro)
 *  - `status`   running | success | partial | error
 *  - `mode`     `counts` solo devuelve contadores (sidebar);
 *               `latest` devuelve el ultimo run de `brand` (detalle de marca);
 *               por defecto, la lista completa.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const brandParam = searchParams.get("brand");
  const brandId = brandParam && UUID.test(brandParam) ? brandParam : null;

  const statusParam = searchParams.get("status");
  const status = SCRAPE_STATUSES.includes(statusParam as ScrapeStatus)
    ? (statusParam as ScrapeStatus)
    : null;

  const mode = searchParams.get("mode");

  if (mode === "counts") {
    const result = await getRunningCounts();
    return result.ok
      ? NextResponse.json({ ok: true, ...result.data })
      : NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  if (mode === "latest") {
    if (!brandId) {
      return NextResponse.json(
        { ok: false, error: "Falta el parámetro `brand`." },
        { status: 400 },
      );
    }
    const result = await getLatestRunForBrand(brandId);
    return result.ok
      ? NextResponse.json({ ok: true, run: result.data })
      : NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  const result = await getScrapeRuns({ brandId, status, limit: RUNS_LIMIT });

  return result.ok
    ? NextResponse.json({ ok: true, ...result.data })
    : NextResponse.json({ ok: false, error: result.error }, { status: 500 });
}
