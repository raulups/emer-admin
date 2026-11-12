import "server-only";

import { triggerScraperWebhook } from "@/lib/n8n";
import { getSupabase } from "@/lib/supabase";
import type { ScrapeStatus } from "@/types/db";
import { IDLE_QUEUE, type ScraperQueueState } from "@/types/scraper";

/**
 * Pasada "todas las marcas" orquestada desde el panel.
 *
 * Antes se mandaba `{}` al flujo padre y n8n recorria todas las marcas en UNA
 * ejecucion, pero n8n corta cada ejecucion a los 15 min (EXECUTIONS_TIMEOUT)
 * y la pasada se quedaba a medias. Ahora el panel lanza marca a marca, espera
 * a que su run termine y pasa a la siguiente: cada ejecucion de n8n es corta.
 */

/** Cada cuanto se mira si el run de la marca en curso ha terminado. */
const POLL_MS = 4000;
/** Si n8n no ha creado el run en este tiempo, se da por perdido. */
const RUN_APPEAR_TIMEOUT_MS = 90_000;
/** n8n corta a los 15 min: pasado esto no va a terminar. */
const RUN_FINISH_TIMEOUT_MS = 16 * 60_000;
/** Pausa entre marcas, como el nodo Wait del flujo padre. */
const BETWEEN_BRANDS_MS = 3000;
/** Margen por si el reloj de Supabase y el local no coinciden. */
const CLOCK_SKEW_MS = 15_000;

// En globalThis para sobrevivir a las recargas de HMR en desarrollo.
const store = globalThis as typeof globalThis & { __emerScraperQueue?: ScraperQueueState };

function state(): ScraperQueueState {
  return store.__emerScraperQueue ?? IDLE_QUEUE;
}

function patch(changes: Partial<ScraperQueueState>) {
  store.__emerScraperQueue = { ...state(), ...changes };
}

export function getQueueState(): ScraperQueueState {
  return state();
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const stopRequested = () => state().status === "stopping";

/** Duerme a trozos para reaccionar rapido a "Detener". */
async function sleepUnlessStopped(ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end && !stopRequested()) {
    await sleep(Math.min(1000, end - Date.now()));
  }
}

type WaitOutcome = { ok: true } | { ok: false; error: string } | { ok: "stopped" };

/** Espera a que el run de la marca lanzado despues de `since` deje de estar en `running`. */
async function waitForRun(brandId: string, since: number): Promise<WaitOutcome> {
  const supabase = getSupabase();
  const sinceIso = new Date(since - CLOCK_SKEW_MS).toISOString();
  let seen = false;

  while (true) {
    await sleepUnlessStopped(POLL_MS);
    if (stopRequested()) return { ok: "stopped" };

    const elapsed = Date.now() - since;
    const { data, error } = await supabase
      .from("scrape_runs")
      .select("status")
      .eq("brand_id", brandId)
      .gte("started_at", sinceIso)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Un fallo puntual de red no debe tumbar la pasada: se reintenta.
    if (!error && data) {
      seen = true;
      if ((data as { status: ScrapeStatus }).status !== "running") return { ok: true };
    }

    if (!seen && elapsed > RUN_APPEAR_TIMEOUT_MS) {
      return { ok: false, error: "n8n no ha creado el run de esta marca." };
    }
    if (elapsed > RUN_FINISH_TIMEOUT_MS) {
      return { ok: false, error: "El run no ha terminado en 16 minutos." };
    }
  }
}

async function runQueue(brands: Array<{ id: string; name: string }>) {
  try {
    for (const brand of brands) {
      if (stopRequested()) break;

      patch({ current: brand });
      const since = Date.now();
      const trigger = await triggerScraperWebhook(brand.id);

      if (!trigger.ok) {
        if (trigger.unreachable) {
          patch({
            abortError: trigger.detail ? `${trigger.error} (${trigger.detail})` : trigger.error,
          });
          break;
        }
        patch({
          done: state().done + 1,
          failures: [
            ...state().failures,
            { brandId: brand.id, brandName: brand.name, error: trigger.error },
          ],
        });
        continue;
      }

      const outcome = await waitForRun(brand.id, since);
      if (outcome.ok === "stopped") break;

      patch({
        done: state().done + 1,
        failures: outcome.ok
          ? state().failures
          : [
              ...state().failures,
              { brandId: brand.id, brandName: brand.name, error: outcome.error },
            ],
      });

      await sleepUnlessStopped(BETWEEN_BRANDS_MS);
    }
  } catch (error) {
    patch({ abortError: error instanceof Error ? error.message : String(error) });
  } finally {
    patch({
      status: "idle",
      current: null,
      finishedAt: new Date().toISOString(),
      stopped: stopRequested(),
    });
  }
}

export type StartQueueResult =
  { ok: true; total: number } | { ok: false; error: string; status: number };

/** Arranca la pasada completa en segundo plano. No espera a que termine. */
export async function startQueue(): Promise<StartQueueResult> {
  if (state().status !== "idle") {
    return { ok: false, error: "Ya hay una pasada de todas las marcas en curso.", status: 409 };
  }

  // Se reserva antes del await para que dos clics seguidos no lancen dos pasadas.
  store.__emerScraperQueue = {
    ...IDLE_QUEUE,
    status: "running",
    startedAt: new Date().toISOString(),
  };

  try {
    const { data, error } = await getSupabase()
      .from("brands")
      .select("id, name")
      .not("url", "is", null)
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    const brands = (data ?? []) as Array<{ id: string; name: string }>;
    if (brands.length === 0) {
      store.__emerScraperQueue = IDLE_QUEUE;
      return { ok: false, error: "No hay marcas con URL que scrapear.", status: 400 };
    }

    patch({ total: brands.length });
    void runQueue(brands);
    return { ok: true, total: brands.length };
  } catch (error) {
    store.__emerScraperQueue = IDLE_QUEUE;
    return {
      ok: false,
      error: `No se han podido leer las marcas: ${error instanceof Error ? error.message : String(error)}`,
      status: 500,
    };
  }
}

/** Pide parar: no se lanzan mas marcas. El run que ya esta en n8n sigue hasta el final. */
export function stopQueue(): boolean {
  if (state().status !== "running") return false;
  patch({ status: "stopping" });
  return true;
}
