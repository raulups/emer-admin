import { BrandsBrowser } from "@/components/brands/BrandsBrowser";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getBrandsList } from "@/lib/queries/brands";

export const dynamic = "force-dynamic";

export const metadata = { title: "Marcas · Emer Admin" };

export default async function BrandsPage() {
  const result = await getBrandsList();

  return (
    <>
      <PageHeader
        title="Marcas"
        description="Edita desde la vista previa: clic en una marca para abrir el pop-up, clic en un tag para activarlo o quitarlo."
      />

      {result.ok ? (
        <BrandsBrowser brands={result.data.brands} countsAvailable={result.data.countsAvailable} />
      ) : (
        <EmptyState
          tone="error"
          title="No se han podido cargar las marcas"
          description={result.error}
        />
      )}
    </>
  );
}
