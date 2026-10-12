import { PageHeader } from "@/components/layout/PageHeader";
import { ProductsFilters } from "@/components/products/ProductsFilters";
import { ProductsPagination } from "@/components/products/ProductsPagination";
import { ProductsTable } from "@/components/products/ProductsTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { parseProductFilters, type RawSearchParams } from "@/lib/product-filters";
import { getFilterOptions, getProductsPage } from "@/lib/queries/products";

export const dynamic = "force-dynamic";

export const metadata = { title: "Productos · Emer Admin" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseProductFilters(await searchParams);

  const [pageResult, optionsResult] = await Promise.all([
    getProductsPage(filters),
    getFilterOptions(),
  ]);

  if (!pageResult.ok) {
    return (
      <>
        <PageHeader title="Productos" />
        <EmptyState
          tone="error"
          title="No se han podido cargar los productos"
          description={pageResult.error}
        />
      </>
    );
  }

  const page = pageResult.data;
  const options = optionsResult.ok ? optionsResult.data : { brands: [], categories: [] };

  return (
    <>
      <PageHeader
        title="Productos"
        description="Catálogo scrapeado desde /products.json de cada tienda Shopify."
      />

      {!optionsResult.ok ? (
        <p className="border-error bg-paper text-error mb-4 border-2 p-3 text-xs">
          No se han podido cargar las marcas y categorías de los filtros: {optionsResult.error}
        </p>
      ) : null}

      <ProductsFilters
        filters={filters}
        brands={options.brands}
        categories={options.categories}
        total={page.total}
      />

      {page.items.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="Ningún producto coincide con los filtros. Prueba a quitar alguno."
        />
      ) : (
        <>
          <ProductsTable products={page.items} />
          <ProductsPagination page={page} filters={filters} />
        </>
      )}
    </>
  );
}
