import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CategoryEditor } from "@/components/products/CategoryEditor";
import { JsonViewer } from "@/components/products/JsonViewer";
import { ProductOverview } from "@/components/products/ProductOverview";
import { ShopifyJsonSkeleton, ShopifyJsonTab } from "@/components/products/ShopifyJsonTab";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { getCategories, getProductDetail } from "@/lib/queries/products";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [detailResult, categoriesResult] = await Promise.all([
    getProductDetail(id),
    getCategories(),
  ]);

  if (!detailResult.ok) {
    return (
      <EmptyState
        tone="error"
        title="No se ha podido cargar el producto"
        description={detailResult.error}
        action={
          <Link href="/products" className={buttonClasses("secondary", "md")}>
            Volver a productos
          </Link>
        }
      />
    );
  }

  if (!detailResult.data) notFound();

  const detail = detailResult.data;
  const { product, brand, category, sizes, priceHistory } = detail;
  const categories = categoriesResult.ok ? categoriesResult.data : [];

  // Registro completo tal y como está en la base de datos.
  const dbRecord = {
    product,
    category,
    product_sizes: sizes,
    product_price_history: priceHistory,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera */}
      <div className="border-ink bg-paper shadow-hard flex flex-col gap-3 border-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-ink/50 flex flex-wrap items-center gap-2 text-xs uppercase">
              <Link href="/products" className="hover:underline">
                Productos /
              </Link>
              {brand ? (
                <Link href={`/brands/${brand.id}`} className="font-bold hover:underline">
                  {brand.name}
                </Link>
              ) : null}
            </div>

            <h1 className="title-xl mt-1 break-words">{product.name ?? "(sin nombre)"}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {category ? (
                <Badge tone="muted">{category.name}</Badge>
              ) : (
                <Badge tone="error">Sin categoría</Badge>
              )}
              {product.category_locked ? <Badge tone="neutral">🔒 Fijada</Badge> : null}
              {product.is_on_sale ? <Badge tone="error">En rebajas</Badge> : null}
              {product.available === false ? <Badge tone="muted">No disponible</Badge> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {product.product_url ? (
              <a
                href={product.product_url}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonClasses("primary", "md")}
              >
                Abrir en tienda ↗
              </a>
            ) : null}
            {brand ? (
              <Link
                href={`/products?brand=${brand.id}`}
                className={buttonClasses("secondary", "md")}
              >
                Ver los de la marca
              </Link>
            ) : null}
          </div>
        </div>

        {/* Categoria editable */}
        <CategoryEditor
          productId={product.id}
          productName={product.name}
          productType={product.product_type?.trim().toLowerCase() || null}
          brandId={product.brand_id}
          brandName={brand?.name ?? null}
          categoryId={product.category_id}
          categoryLocked={product.category_locked}
          categories={categories}
        />

        {!categoriesResult.ok ? (
          <p className="border-error text-error border-2 p-2 text-xs">
            No se han podido cargar las categorías: {categoriesResult.error}
          </p>
        ) : null}
      </div>

      {/* Pestañas */}
      <Tabs
        items={[
          {
            id: "vista",
            label: "Vista",
            content: <ProductOverview detail={detail} />,
          },
          {
            id: "json-bd",
            label: "JSON BD",
            content: (
              <JsonViewer
                value={dbRecord}
                filename={`producto-${product.handle ?? product.id}`}
                note="Registro completo en Supabase"
              />
            ),
          },
          {
            id: "json-shopify",
            label: "JSON Shopify",
            content: (
              <Suspense fallback={<ShopifyJsonSkeleton />}>
                <ShopifyJsonTab productUrl={product.product_url} handle={product.handle} />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
