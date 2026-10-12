import { Suspense } from "react";

import { MappingsTab } from "@/components/classification/MappingsTab";
import { ReviewTab } from "@/components/classification/ReviewTab";
import { RulesTab } from "@/components/classification/RulesTab";
import { UnclassifiedTab } from "@/components/classification/UnclassifiedTab";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingBlock } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import { getMappings, getRules, getUnclassifiedGroups } from "@/lib/queries/classification";
import { getBrandsForFilter } from "@/lib/queries/scraper";
import { getCategories } from "@/lib/queries/products";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clasificación · Emer Admin" };

/**
 * Agrupar los ~2.900 productos sin categoria son 3 peticiones paginadas a
 * PostgREST (~5 s). Va en su propio componente para poder envolverlo en
 * <Suspense> y que la pagina pinte sin esperarlo.
 */
async function UnclassifiedSection({
  categories,
}: {
  categories: Array<{ id: string; name: string }>;
}) {
  const unclassified = await getUnclassifiedGroups();

  if (!unclassified.ok) {
    return (
      <EmptyState
        tone="error"
        title="No se han podido cargar los productos sin categoría"
        description={unclassified.error}
      />
    );
  }

  return (
    <UnclassifiedTab
      groups={unclassified.data.groups}
      total={unclassified.data.total}
      truncated={unclassified.data.truncated}
      categories={categories}
    />
  );
}

export default async function ClassificationPage() {
  const [rules, mappings, brandsResult, categoriesResult] = await Promise.all([
    getRules(),
    getMappings(),
    getBrandsForFilter(),
    getCategories(),
  ]);

  const brands = brandsResult.ok ? brandsResult.data : [];
  const categories = categoriesResult.ok ? categoriesResult.data : [];

  return (
    <>
      <PageHeader
        title="Clasificación"
        description="Cómo decide el scraper la categoría de cada producto, y cómo corregirlo."
      />

      <Tabs
        items={[
          {
            id: "sin-categoria",
            label: "Sin categoría",
            content: (
              <Suspense fallback={<LoadingBlock text="Agrupando los productos sin categoría…" />}>
                <UnclassifiedSection categories={categories} />
              </Suspense>
            ),
          },
          {
            id: "revision",
            label: "Revisión",
            content: <ReviewTab brands={brands} categories={categories} />,
          },
          {
            id: "reglas",
            label: "Reglas",
            content: rules.ok ? (
              <RulesTab rules={rules.data} categories={categories} />
            ) : (
              <EmptyState
                tone="error"
                title="No se han podido cargar las reglas"
                description={rules.error}
              />
            ),
          },
          {
            id: "mappings",
            label: "Mappings",
            content: mappings.ok ? (
              <MappingsTab mappings={mappings.data} brands={brands} categories={categories} />
            ) : (
              <EmptyState
                tone="error"
                title="No se han podido cargar los mapeos"
                description={mappings.error}
              />
            ),
          },
        ]}
      />
    </>
  );
}
