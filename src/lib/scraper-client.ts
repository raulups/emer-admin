/**
 * Llamadas al scraper desde el navegador. Sin "use client": son funciones
 * normales que solo usan `fetch`, asi que valen en cualquier Client Component.
 */

export type LaunchResult = { ok: true; message: string } | { ok: false; error: string };

/** Lanza el scraper. Sin `brandId` se lanzan todas las marcas. */
export async function launchScraper(brandId?: string): Promise<LaunchResult> {
  try {
    const response = await fetch("/api/scraper/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brandId ? { brandId } : {}),
      cache: "no-store",
    });

    const data: unknown = await response.json().catch(() => null);

    if (!response.ok || !data || typeof data !== "object" || !("ok" in data) || !data.ok) {
      const payload = data as { error?: string; detail?: string } | null;
      const error = payload?.error ?? `El servidor ha respondido ${response.status}.`;
      return { ok: false, error: payload?.detail ? `${error}\n${payload.detail}` : error };
    }

    const payload = data as { message?: string };
    return { ok: true, message: payload.message ?? "Scraper lanzado." };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `No se ha podido contactar con el panel: ${error.message}`
          : "No se ha podido contactar con el panel.",
    };
  }
}
