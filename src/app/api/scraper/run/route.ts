import { NextResponse } from "next/server";
import { z } from "zod";

import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/** n8n contesta al instante: solo confirmamos que ha recogido la llamada. */
const WEBHOOK_TIMEOUT_MS = 5000;

const bodySchema = z.object({
  brandId: z.uuid("brandId debe ser un UUID").optional(),
});

/** Mensaje unico para cuando n8n no está escuchando. */
const N8N_DOWN =
  "n8n no está arrancado: abre Docker y comprueba que el workflow 'Scrapper padre' está activo";

function errorCodeOf(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === "object" && "code" in cause) {
    return String((cause as { code: unknown }).code);
  }
  if ("code" in error) return String((error as { code: unknown }).code);
  return null;
}

/**
 * POST /api/scraper/run
 *
 * Body: `{ brandId?: string }`. Lanza el webhook del flujo padre de n8n con
 * `{ brand_id }` para una marca, o `{}` para todas.
 */
export async function POST(request: Request) {
  let env: ReturnType<typeof getEnv>;
  try {
    env = getEnv();
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Entorno mal configurado" },
      { status: 500 },
    );
  }

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
  const webhookBody = brandId ? { brand_id: brandId } : {};

  try {
    const response = await fetch(env.N8N_SCRAPER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookBody),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      // 404 en n8n = webhook no registrado, casi siempre workflow inactivo.
      const detail =
        response.status === 404
          ? "n8n responde pero no reconoce el webhook: activa el workflow 'Scrapper padre' o revisa N8N_SCRAPER_WEBHOOK_URL."
          : `n8n ha respondido ${response.status} ${response.statusText}.`;

      return NextResponse.json({ ok: false, error: detail }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      launched: brandId ? "brand" : "all",
      brandId: brandId ?? null,
      message: brandId
        ? "Scraper lanzado para la marca."
        : "Scraper lanzado para todas las marcas.",
    });
  } catch (error) {
    const code = errorCodeOf(error);
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    const isRefused =
      code === "ECONNREFUSED" ||
      code === "ENOTFOUND" ||
      code === "EAI_AGAIN" ||
      code === "UND_ERR_SOCKET";

    if (isTimeout || isRefused) {
      return NextResponse.json(
        {
          ok: false,
          error: N8N_DOWN,
          detail: isTimeout
            ? `No ha respondido en ${WEBHOOK_TIMEOUT_MS / 1000} s (${env.N8N_SCRAPER_WEBHOOK_URL})`
            : `${code} al conectar con ${env.N8N_SCRAPER_WEBHOOK_URL}`,
        },
        { status: isTimeout ? 504 : 502 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: N8N_DOWN,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
