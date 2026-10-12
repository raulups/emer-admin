import Link from "next/link";

import { BrandsBrowser } from "@/components/brands/BrandsBrowser";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
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
        description="Marcas del marketplace, con sus productos y el estado del último scrape."
        actions={
          <Link href="/brands/new" className={buttonClasses("primary", "md")}>
            Nueva marca
          </Link>
        }
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
