import "server-only";

import { getEnv } from "@/lib/env";

/** n8n contesta al instante: solo confirmamos que ha recogido la llamada. */
export const WEBHOOK_TIMEOUT_MS = 5000;

/** Mensaje unico para cuando n8n no esta escuchando. */
export const N8N_DOWN =
  "n8n no está arrancado: abre Docker y comprueba que el workflow 'Scrapper padre' está activo";

export type TriggerResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      detail?: string;
      /** Status HTTP sugerido para la respuesta del panel. */
      status: number;
      /** n8n no responde: no tiene sentido seguir intentando con otras marcas. */
      unreachable: boolean;
    };

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
 * Dispara el webhook del flujo padre de n8n para UNA marca (`{ brand_id }`).
 *
 * El panel ya no manda nunca `{}` (todas): n8n corta cada ejecucion a los
 * 15 min (EXECUTIONS_TIMEOUT) y una pasada completa tarda mas. La pasada
 * completa la orquesta `scraper-queue.ts`, marca a marca.
 */
export async function triggerScraperWebhook(brandId: string): Promise<TriggerResult> {
  let url: string;
  try {
    url = getEnv().N8N_SCRAPER_WEBHOOK_URL;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Entorno mal configurado",
      status: 500,
      unreachable: true,
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand_id: brandId }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      // 404 en n8n = webhook no registrado, casi siempre workflow inactivo.
      const notRegistered = response.status === 404;
      return {
        ok: false,
        error: notRegistered
          ? "n8n responde pero no reconoce el webhook: activa el workflow 'Scrapper padre' o revisa N8N_SCRAPER_WEBHOOK_URL."
          : `n8n ha respondido ${response.status} ${response.statusText}.`,
        status: 502,
        unreachable: notRegistered,
      };
    }

    return { ok: true };
  } catch (error) {
    const code = errorCodeOf(error);
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    const isRefused =
      code === "ECONNREFUSED" ||
      code === "ENOTFOUND" ||
      code === "EAI_AGAIN" ||
      code === "UND_ERR_SOCKET";

    let detail: string;
    if (isTimeout) detail = `No ha respondido en ${WEBHOOK_TIMEOUT_MS / 1000} s (${url})`;
    else if (isRefused) detail = `${code} al conectar con ${url}`;
    else detail = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      error: N8N_DOWN,
      detail,
      status: isTimeout ? 504 : 502,
      unreachable: true,
    };
  }
}
