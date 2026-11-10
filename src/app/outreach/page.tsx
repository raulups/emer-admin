import { PageHeader } from "@/components/layout/PageHeader";
import { OutreachFilters } from "@/components/outreach/OutreachFilters";
import { OutreachTable } from "@/components/outreach/OutreachTable";
import { StatCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { filterOutreach, parseOutreachFilters } from "@/lib/outreach-filters";
import { getOutreachOverview } from "@/lib/queries/outreach";
import type { RawSearchParams } from "@/lib/scrape-filters";
import { formatNumber, percentOf } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Contacto · Emer Admin" };

const HEADER = (
  <PageHeader
    title="Contacto"
    description="Seguimiento de las peticiones a las marcas para que den el visto bueno a aparecer en Emer."
  />
);

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseOutreachFilters(await searchParams);
  const result = await getOutreachOverview();

  if (!result.ok) {
    return (
      <>
        {HEADER}
        <EmptyState
          tone="error"
          title="No se ha podido cargar el seguimiento"
          description={result.error}
        />
      </>
    );
  }

  const { items: allItems, counts } = result.data;
  const items = filterOutreach(allItems, filters);

  return (
    <>
      {HEADER}

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Visto bueno"
            value={formatNumber(counts.approved)}
            tone="ok"
            detail={`${percentOf(counts.approved, counts.total)} % de ${formatNumber(counts.total)} marcas`}
          />
          <StatCard
            label="Esperando / hablando"
            value={formatNumber(counts.contacted + counts.in_conversation)}
            tone="progress"
            detail={`${formatNumber(counts.in_conversation)} en conversación`}
          />
          <StatCard
            label="Rechazadas / sin respuesta"
            value={formatNumber(counts.rejected + counts.no_response)}
            tone="error"
            detail={`${formatNumber(counts.rejected)} rechazadas`}
          />
          <StatCard
            label="Sin contactar"
            value={formatNumber(counts.pending)}
            detail={
              counts.due > 0
                ? `${formatNumber(counts.due)} seguimiento(s) vencido(s)`
                : "Ningún seguimiento vencido"
            }
          />
        </div>

        <OutreachFilters filters={filters} shown={items.length} total={allItems.length} />

        {items.length > 0 ? (
          <OutreachTable items={items} />
        ) : (
          <EmptyState
            title="Sin marcas"
            description={
              allItems.length === 0
                ? "Todavía no hay marcas dadas de alta."
                : "Ninguna marca coincide con los filtros."
            }
          />
        )}
      </div>
    </>
  );
}
