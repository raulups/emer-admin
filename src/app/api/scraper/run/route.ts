import { NextResponse } from "next/server";
import { z } from "zod";

import { triggerScraperWebhook } from "@/lib/n8n";
import { getQueueState, startQueue, stopQueue } from "@/lib/scraper-queue";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  brandId: z.uuid("brandId debe ser un UUID").optional(),
});

/**
 * POST /api/scraper/run
 *
 * Body: `{ brandId?: string }`.
 *  - Con `brandId`: dispara el webhook del flujo padre de n8n para esa marca.
 *  - Sin `brandId`: arranca la pasada completa marca a marca (`scraper-queue.ts`),
 *    en lugar de mandar `{}` a n8n, que corta la ejecucion a los 15 min.
 */
export async function POST(request: Request) {
  let payload: unknown = {};
  try {
    const text = await request.text();
    payload = text.trim() === "" ? {} : JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "El cuerpo no es JSON válido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
      { status: 400 },
    );
  }

  const brandId = parsed.data.brandId;

  if (!brandId) {
    const result = await startQueue();
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      ok: true,
      launched: "all",
      brandId: null,
      message: `Pasada iniciada: ${result.total} marcas, una detrás de otra.`,
    });
  }

  const result = await triggerScraperWebhook(brandId);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, detail: result.detail },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    launched: "brand",
    brandId,
    message: "Scraper lanzado para la marca.",
  });
}

/** GET /api/scraper/run: estado de la pasada completa. */
export function GET() {
  return NextResponse.json({ ok: true, queue: getQueueState() });
}

/** DELETE /api/scraper/run: detiene la pasada completa (la marca en curso termina en n8n). */
export function DELETE() {
  const stopped = stopQueue();
  return stopped
    ? NextResponse.json({ ok: true, message: "Pasada detenida: no se lanzarán más marcas." })
    : NextResponse.json({ ok: false, error: "No hay ninguna pasada en curso." }, { status: 409 });
}
