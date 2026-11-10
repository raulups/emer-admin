import { DeleteMessageButton } from "@/components/outreach/DeleteMessageButton";
import { cn, formatDateTime } from "@/lib/utils";
import { MESSAGE_DIRECTION_LABELS, OUTREACH_CHANNEL_LABELS } from "@/lib/validation/outreach";
import type { BrandOutreachMessage, Uuid } from "@/types/db";

/** Historial de mensajes, del mas reciente al mas antiguo. */
export function MessageTimeline({
  brandId,
  messages,
}: {
  brandId: Uuid;
  messages: BrandOutreachMessage[];
}) {
  if (messages.length === 0) {
    return (
      <p className="text-ink/60 border-ink/30 border-2 border-dashed p-4 text-center text-sm">
        Todavía no hay mensajes. Registra el primero arriba.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {messages.map((message) => {
        const inbound = message.direction === "inbound";
        return (
          <li
            key={message.id}
            className={cn(
              "border-ink border-2",
              inbound ? "bg-cream mr-6 sm:mr-12" : "bg-paper ml-6 sm:ml-12",
            )}
          >
            <div
              className={cn(
                "border-ink flex flex-wrap items-center justify-between gap-2 border-b-2 px-3 py-1.5",
                inbound ? "bg-ink text-cream" : "bg-cream",
              )}
            >
              <span className="text-[10px] font-bold tracking-widest uppercase">
                {inbound ? "← " : "→ "}
                {MESSAGE_DIRECTION_LABELS[message.direction]} ·{" "}
                {OUTREACH_CHANNEL_LABELS[message.channel]}
              </span>
              <span className="flex items-center gap-3 text-[11px]">
                <time dateTime={message.sent_at}>{formatDateTime(message.sent_at)}</time>
                <DeleteMessageButton
                  brandId={brandId}
                  messageId={message.id}
                  tone={inbound ? "dark" : "light"}
                />
              </span>
            </div>
            <p className="px-3 py-2 text-sm whitespace-pre-wrap">{message.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
