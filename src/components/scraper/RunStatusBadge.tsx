import { Badge } from "@/components/ui/Badge";
import { SCRAPE_STATUS_LABELS, SCRAPE_STATUS_TONES } from "@/lib/scrape-status";
import type { ScrapeStatus } from "@/types/db";

/**
 * Badge de estado de un run. A diferencia del de Marcas, este anima el estado
 * `running` y distingue los runs atascados.
 */
export function RunStatusBadge({
  status,
  stale = false,
}: {
  status: ScrapeStatus;
  stale?: boolean;
}) {
  if (status === "running" && stale) {
    return <Badge tone="muted">⚠ Sin terminar</Badge>;
  }

  if (status === "running") {
    return (
      <Badge tone="progress">
        <span
          aria-hidden
          className="border-ink mr-1.5 inline-block size-2.5 animate-spin border-2 border-t-transparent"
        />
        En curso
      </Badge>
    );
  }

  // `partial` se pinta en naranja para distinguirlo del amarillo de "en curso".
  if (status === "partial") {
    return (
      <Badge tone="muted" className="text-paper bg-[#E07B29]">
        Parcial
      </Badge>
    );
  }

  return <Badge tone={SCRAPE_STATUS_TONES[status]}>{SCRAPE_STATUS_LABELS[status]}</Badge>;
}
