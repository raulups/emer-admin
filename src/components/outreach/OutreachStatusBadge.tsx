import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { OUTREACH_STATUS_LABELS } from "@/lib/validation/outreach";
import type { OutreachStatus } from "@/types/db";

export const OUTREACH_STATUS_TONES: Record<OutreachStatus, BadgeTone> = {
  pending: "muted",
  contacted: "progress",
  in_conversation: "progress",
  approved: "ok",
  rejected: "error",
  no_response: "neutral",
};

/** Fondo de la fila del listado, a juego con el badge. */
export const OUTREACH_ROW_TONES: Record<OutreachStatus, string> = {
  pending: "",
  contacted: "bg-progress/15",
  in_conversation: "bg-progress/30",
  approved: "bg-ok/10",
  rejected: "bg-error/10",
  no_response: "bg-ink/5",
};

export function OutreachStatusBadge({ status }: { status: OutreachStatus }) {
  return <Badge tone={OUTREACH_STATUS_TONES[status]}>{OUTREACH_STATUS_LABELS[status]}</Badge>;
}
