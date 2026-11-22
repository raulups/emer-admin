import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { WaitlistTable } from "@/components/waitlist/WaitlistTable";
import { getWaitlist } from "@/lib/queries/waitlist";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Lista de espera · Emer Admin" };

const HEADER = (
  <PageHeader
    title="Lista de espera"
    description="Emails que se han apuntado desde la web de móvil para que les avisemos cuando la app esté publicada."
  />
);

export default async function WaitlistPage() {
  const result = await getWaitlist();

  if (!result.ok) {
    return (
      <>
        {HEADER}
        <EmptyState
          tone="error"
          title="No se ha podido cargar la lista de espera"
          description={result.error}
        />
      </>
    );
  }

  const { entries, counts } = result.data;

  return (
    <>
      {HEADER}

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Apuntados" value={formatNumber(counts.total)} />
          <StatCard
            label="Últimos 7 días"
            value={formatNumber(counts.lastWeek)}
            tone={counts.lastWeek > 0 ? "ok" : "default"}
          />
          <StatCard label="Por avisar" value={formatNumber(counts.pending)} tone="progress" />
          <StatCard label="Avisados" value={formatNumber(counts.notified)} tone="ok" />
        </div>

        {entries.length === 0 ? (
          <EmptyState
            title="Todavía no se ha apuntado nadie"
            description="Aparecerán aquí en cuanto alguien deje su email en el aviso «Mejor en la app» de la web de móvil."
          />
        ) : (
          <WaitlistTable entries={entries} />
        )}
      </div>
    </>
  );
}
