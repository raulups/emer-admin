"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useScraperStatus } from "@/components/scraper/ScraperStatusProvider";
import { cn } from "@/lib/utils";
import { usePageVisible } from "@/lib/use-page-visible";

/**
 * Recarga la tabla de ejecuciones cuando cambia el estado que ya vigila la
 * sidebar (runs en curso, atascados o avance de la pasada completa). No hace
 * consultas propias: reutiliza el polling de `ScraperStatusProvider`.
 */
export function ScrapesAutoRefresh() {
  const router = useRouter();
  const visible = usePageVisible();
  const { activeCount, staleCount, queue } = useScraperStatus();

  const signature = [
    activeCount,
    staleCount,
    queue.status,
    queue.done,
    queue.current?.id ?? "",
    queue.failures.length,
    queue.abortError ?? "",
  ].join("|");

  const lastRef = useRef(signature);

  useEffect(() => {
    if (lastRef.current === signature) return;
    lastRef.current = signature;
    router.refresh();
  }, [signature, router]);

  const busy = activeCount > 0 || queue.status !== "idle";

  return (
    <span
      className={cn(
        "border-line inline-flex items-center gap-2 border px-2 py-1 text-[11px] font-semibold",
        visible ? "bg-paper" : "bg-subtle",
      )}
      title="La tabla se actualiza sola al empezar o terminar cada ejecución."
    >
      <span
        aria-hidden
        className={cn(
          "border-line size-2.5 border",
          visible && busy ? "bg-progress animate-pulse" : "bg-paper",
        )}
      />
      {visible ? (busy ? "Actualizando" : "Automático") : "En pausa"}
    </span>
  );
}
