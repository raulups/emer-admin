"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { OUTREACH_ROW_TONES } from "@/components/outreach/OutreachStatusBadge";
import { OutreachStatusSelect } from "@/components/outreach/OutreachStatusSelect";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { displayUrl } from "@/lib/url";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { MESSAGE_DIRECTION_LABELS, OUTREACH_CHANNEL_LABELS } from "@/lib/validation/outreach";
import type { OutreachListItem } from "@/types/outreach";

export function OutreachTable({ items }: { items: OutreachListItem[] }) {
  const router = useRouter();

  return (
    <TableWrapper>
      <Table>
        <THead>
          <TR>
            <TH>Marca</TH>
            <TH>Estado</TH>
            <TH>Contacto</TH>
            <TH>Último mensaje</TH>
            <TH className="text-right">Mensajes</TH>
            <TH>Seguimiento</TH>
            <TH>
              <span className="sr-only">Abrir</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {items.map((item) => {
            const href = `/outreach/${item.brand.id}`;
            const { outreach, lastMessage } = item;
            return (
              <TR
                key={item.brand.id}
                interactive
                onClick={() => router.push(href)}
                className={cn(OUTREACH_ROW_TONES[item.status])}
              >
                <TD className="whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-bold">{item.brand.name}</span>
                    {item.brand.url ? (
                      <span className="text-ink/50 text-xs">{displayUrl(item.brand.url)}</span>
                    ) : null}
                  </div>
                </TD>
                <TD className="whitespace-nowrap">
                  <OutreachStatusSelect
                    brandId={item.brand.id}
                    brandName={item.brand.name}
                    status={item.status}
                  />
                </TD>
                <TD className="text-xs">
                  <div className="flex flex-col">
                    {outreach?.instagram ? <span>@{outreach.instagram}</span> : null}
                    {outreach?.email ? <span>{outreach.email}</span> : null}
                    {!outreach?.instagram && !outreach?.email ? (
                      <span className="text-ink/40">—</span>
                    ) : null}
                  </div>
                </TD>
                <TD className="text-xs whitespace-nowrap">
                  {lastMessage ? (
                    <div className="flex flex-col">
                      <span className="font-bold">
                        {MESSAGE_DIRECTION_LABELS[lastMessage.direction]} ·{" "}
                        {OUTREACH_CHANNEL_LABELS[lastMessage.channel]}
                      </span>
                      <span className="text-ink/60" suppressHydrationWarning>
                        {formatRelativeTime(lastMessage.sent_at)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-ink/40">—</span>
                  )}
                </TD>
                <TD className="text-right">{item.messageCount}</TD>
                <TD className="text-xs whitespace-nowrap">
                  {outreach?.follow_up_at ? (
                    <span className={cn(item.followUpDue && "text-error font-bold")}>
                      {formatDate(`${outreach.follow_up_at}T00:00:00`)}
                      {item.followUpDue ? " · vencido" : ""}
                    </span>
                  ) : (
                    <span className="text-ink/40">—</span>
                  )}
                </TD>
                <TD className="text-right">
                  <Link
                    href={href}
                    onClick={(event) => event.stopPropagation()}
                    className="label-caps whitespace-nowrap underline-offset-2 hover:underline"
                  >
                    Abrir →
                  </Link>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </TableWrapper>
  );
}
