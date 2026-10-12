"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useScraperStatus } from "@/components/scraper/ScraperStatusProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { launchScraper } from "@/lib/scraper-client";
import { formatNumber } from "@/lib/utils";

/** Lanza el flujo padre de n8n para TODAS las marcas. */
export function LaunchAllButton({ brandsCount }: { brandsCount: number }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { refresh } = useScraperStatus();
  const [open, setOpen] = useState(false);

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
              Se va a lanzar el flujo padre de n8n para las{" "}
              <strong>{formatNumber(brandsCount)} marcas</strong> del catálogo.
            </p>
            <p>
              Cada marca lee su{" "}
              <code className="bg-cream px-1 font-mono text-xs">/products.json</code> y actualiza
              sus productos. Puede tardar un rato y durante ese tiempo verás las ejecuciones en
              curso en esta misma página.
            </p>
            <p className="text-ink/60">
              n8n debe estar arrancado y el workflow &quot;Scrapper padre&quot; activo.
            </p>
          </div>
        }
      />
    </>
  );
}
