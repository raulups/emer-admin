import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
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
      <Badge tone="progress" className="stripes">
        <Spinner size="xs" label="En curso" className="mr-1.5" />
        En curso
      </Badge>
    );
  }

  // `partial` se pinta en naranja para distinguirlo del amarillo de "en curso".
  if (status === "partial") {
    return (
      <Badge tone="muted" className="text-paper! bg-[#E07B29]!">
        Parcial
      </Badge>
    );
  }

  return <Badge tone={SCRAPE_STATUS_TONES[status]}>{SCRAPE_STATUS_LABELS[status]}</Badge>;
}
