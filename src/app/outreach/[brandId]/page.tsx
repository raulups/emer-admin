import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { MessageForm } from "@/components/outreach/MessageForm";
import { MessageTimeline } from "@/components/outreach/MessageTimeline";
import { OutreachForm } from "@/components/outreach/OutreachForm";
import { OutreachStatusBadge } from "@/components/outreach/OutreachStatusBadge";
import { buttonClasses } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getOutreachDetail } from "@/lib/queries/outreach";
import { UUID } from "@/lib/scrape-filters";
import { displayUrl } from "@/lib/url";
import { formatDateTime } from "@/lib/utils";
import { outreachToFormInput } from "@/lib/validation/outreach";

export const dynamic = "force-dynamic";

export default async function OutreachDetailPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  if (!UUID.test(brandId)) notFound();

  const result = await getOutreachDetail(brandId);

  if (!result.ok) {
    return (
      <EmptyState
        tone="error"
        title="No se ha podido cargar el contacto"
        description={result.error}
        action={
          <Link href="/outreach" className={buttonClasses("secondary", "sm")}>
            Volver
          </Link>
        }
      />
    );
  }
  if (!result.data) notFound();

  const { brand, outreach, messages } = result.data;
  const status = outreach?.status ?? "pending";
  const defaultChannel =
    messages[0]?.channel ?? (outreach?.email && !outreach.instagram ? "email" : "instagram");

  return (
    <>
      <PageHeader
        title={brand.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <OutreachStatusBadge status={status} />
            {outreach?.decided_at ? (
              <span>Decidido el {formatDateTime(outreach.decided_at)}</span>
            ) : null}
            {brand.url ? (
              <a
                href={brand.url}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {displayUrl(brand.url)} ↗
              </a>
            ) : null}
            {outreach?.instagram ? (
              <a
                href={`https://instagram.com/${outreach.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                @{outreach.instagram} ↗
              </a>
            ) : null}
            {outreach?.email ? (
              <a href={`mailto:${outreach.email}`} className="underline-offset-2 hover:underline">
                {outreach.email}
              </a>
            ) : null}
          </span>
        }
        actions={
          <>
            <Link href="/outreach" className={buttonClasses("secondary", "sm")}>
              ← Contacto
            </Link>
            <Link href={`/brands/${brand.id}`} className={buttonClasses("secondary", "sm")}>
              Ver marca
            </Link>
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Estado y datos de contacto">
            {outreach?.updated_at ? (
              <p className="text-ink/60 text-xs">
                Actualizado el {formatDateTime(outreach.updated_at)}
              </p>
            ) : null}
          </CardHeader>
          <CardBody>
            <OutreachForm brandId={brand.id} initial={outreachToFormInput(outreach)} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Mensajes (${messages.length})`} />
          <CardBody className="flex flex-col gap-5">
            <MessageForm
              brandId={brand.id}
              defaultChannel={defaultChannel}
              currentStatus={status}
            />
            <div className="border-ink border-t-2 pt-4">
              <MessageTimeline brandId={brand.id} messages={messages} />
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
