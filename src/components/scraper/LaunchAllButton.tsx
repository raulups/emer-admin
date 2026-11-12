"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useScraperStatus } from "@/components/scraper/ScraperStatusProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { launchScraper, stopScraperQueue } from "@/lib/scraper-client";
import { formatNumber } from "@/lib/utils";

/**
 * Lanza la pasada de TODAS las marcas. El panel las lanza en n8n una detras de
 * otra (ver `scraper-queue.ts`); aqui se muestra el progreso y se puede detener.
 */
export function LaunchAllButton({ brandsCount }: { brandsCount: number }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { queue, refresh } = useScraperStatus();
  const [open, setOpen] = useState(false);
  const [stopping, setStopping] = useState(false);

  const busy = queue.status !== "idle";

  // Aviso al terminar la pasada (solo si la hemos visto en curso en esta pestaña).
  const prevStatus = useRef(queue.status);
  useEffect(() => {
    const wasBusy = prevStatus.current !== "idle";
    prevStatus.current = queue.status;
    if (!wasBusy || queue.status !== "idle") return;

    setStopping(false);
    router.refresh();

    if (queue.abortError) {
      showToast(`La pasada se ha cortado: ${queue.abortError}`, "error");
    } else if (queue.stopped) {
      showToast(`Pasada detenida tras ${queue.done} de ${queue.total} marcas.`, "ok");
    } else if (queue.failures.length > 0) {
      const names = queue.failures.map((failure) => failure.brandName).join(", ");
      showToast(
        `Pasada terminada: ${queue.total} marcas, ${queue.failures.length} sin terminar (${names}).`,
        "error",
      );
    } else {
      showToast(`Pasada terminada: ${queue.total} marcas.`, "ok");
    }
  }, [queue, router, showToast]);

  async function onConfirm() {
    const result = await launchScraper();

    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }

    setOpen(false);
    showToast(result.message, "ok");
    refresh();
    router.refresh();
  }

  async function onStop() {
    setStopping(true);
    const result = await stopScraperQueue();
    if (!result.ok) {
      setStopping(false);
      showToast(result.error, "error");
      return;
    }
    showToast(result.message, "ok");
    refresh();
  }

  if (busy) {
    return (
      <div className="border-ink bg-progress flex items-center gap-3 border-2 px-3 py-1.5 text-sm">
        <Spinner size="xs" />
        <span className="font-bold">
          {queue.status === "stopping" ? "Deteniendo…" : "Todas las marcas"}{" "}
          {formatNumber(Math.min(queue.done + 1, queue.total))}/{formatNumber(queue.total)}
        </span>
        {queue.current ? <span className="truncate">{queue.current.name}</span> : null}
        <Button
          size="sm"
          variant="secondary"
          onClick={onStop}
          loading={stopping || queue.status === "stopping"}
        >
          Detener
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Lanzar todas las marcas</Button>

      <ConfirmDialog
        open={open}
        title="Lanzar el scraper de todas las marcas"
        confirmLabel="Lanzar"
        confirmVariant="primary"
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
        description={
          <div className="flex flex-col gap-2">
            <p>
              Se van a scrapear las <strong>{formatNumber(brandsCount)} marcas</strong> del
              catálogo, <strong>una detrás de otra</strong>: el panel lanza cada marca en n8n y
              espera a que termine antes de pasar a la siguiente.
            </p>
            <p>
              Cada marca lee su{" "}
              <code className="bg-cream px-1 font-mono text-xs">/products.json</code> y actualiza
              sus productos. Tarda unos 20 minutos; puedes detenerla en cualquier momento.
            </p>
            <p className="text-ink/60">
              Mantén el panel arrancado (<code className="font-mono text-xs">npm run dev</code>)
              hasta que termine: la pasada vive en el servidor del panel. n8n debe estar arrancado y
              el workflow &quot;Scrapper padre&quot; activo.
            </p>
          </div>
        }
      />
    </>
  );
}
