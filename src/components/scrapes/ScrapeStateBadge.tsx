import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import {
  SCRAPE_RUN_STATE_LABELS,
  SCRAPE_RUN_STATE_TONES,
  type ScrapeRunState,
} from "@/types/scrapes";

export function ScrapeStateBadge({ status }: { status: ScrapeRunState }) {
  if (status === "running") {
    return (
      <Badge tone="progress" className="stripes">
        <Spinner size="xs" label="En curso" className="mr-1.5" />
        {SCRAPE_RUN_STATE_LABELS.running}
      </Badge>
    );
  }

  if (status === "partial") {
    return (
      <Badge tone="muted" className="text-paper! bg-[#E07B29]!">
        {SCRAPE_RUN_STATE_LABELS.partial}
      </Badge>
    );
  }

  return (
    <Badge tone={SCRAPE_RUN_STATE_TONES[status] ?? "muted"}>
      {SCRAPE_RUN_STATE_LABELS[status] ?? status}
    </Badge>
  );
}
