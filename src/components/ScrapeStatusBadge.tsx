import { Badge } from "@/components/ui/Badge";
import { SCRAPE_STATUS_LABELS, SCRAPE_STATUS_TONES } from "@/lib/scrape-status";
import type { ScrapeStatus } from "@/types/db";

export function ScrapeStatusBadge({ status }: { status: ScrapeStatus }) {
  return <Badge tone={SCRAPE_STATUS_TONES[status]}>{SCRAPE_STATUS_LABELS[status]}</Badge>;
}
