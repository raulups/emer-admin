"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { IDLE_POLL_MS, RUNS_POLL_MS } from "@/types/scraper";

interface ScraperStatus {
  /** Runs realmente en curso (los atascados no cuentan). */
  activeCount: number;
  /** Runs en `running` que llevan demasiado tiempo. */
  staleCount: number;
  /** Fuerza una comprobacion inmediata (se llama justo despues de lanzar). */
  refresh: () => void;
}

const ScraperStatusContext = createContext<ScraperStatus | null>(null);

/**
 * Vigila si hay scrapes en curso para el indicador de la sidebar.
 *
 * El ritmo se adapta: cada 3 s mientras hay actividad y cada 15 s cuando no
 * la hay (un scrape puede arrancarlo n8n por su cuenta, asi que hay que
 * seguir mirando de vez en cuando).
 */
export function ScraperStatusProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState({ activeCount: 0, staleCount: 0 });

  // El bucle de polling lee el estado por ref para no reprogramarse en cada cambio.
  const activeRef = useRef(0);
  const refreshRef = useRef<(() => void) | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/scraper/runs?mode=counts", { cache: "no-store" });
      const data: unknown = await response.json();

      if (data && typeof data === "object" && "ok" in data && data.ok) {
        const payload = data as { activeCount?: number; staleCount?: number };
        const activeCount = payload.activeCount ?? 0;
        activeRef.current = activeCount;
        setCounts({ activeCount, staleCount: payload.staleCount ?? 0 });
      }
    } catch {
      // Sin red o servidor caído: se reintenta en el siguiente ciclo.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      await load();
      if (cancelled) return;
      timer = setTimeout(tick, activeRef.current > 0 ? RUNS_POLL_MS : IDLE_POLL_MS);
    };

    // Primera comprobacion inmediata para que el indicador salga al entrar.
    timer = setTimeout(tick, 0);

    refreshRef.current = () => {
      if (timer) clearTimeout(timer);
      void tick();
    };

    return () => {
      cancelled = true;
      refreshRef.current = null;
      if (timer) clearTimeout(timer);
    };
  }, [load]);

  const refresh = useCallback(() => refreshRef.current?.(), []);

  const value = useMemo<ScraperStatus>(
    () => ({ activeCount: counts.activeCount, staleCount: counts.staleCount, refresh }),
    [counts.activeCount, counts.staleCount, refresh],
  );

  return <ScraperStatusContext.Provider value={value}>{children}</ScraperStatusContext.Provider>;
}

/**
 * Estado del scraper. Devuelve ceros si se usa fuera del proveedor, para que
 * un componente suelto no reviente.
 */
export function useScraperStatus(): ScraperStatus {
  return (
    useContext(ScraperStatusContext) ?? {
      activeCount: 0,
      staleCount: 0,
      refresh: () => {},
    }
  );
}
