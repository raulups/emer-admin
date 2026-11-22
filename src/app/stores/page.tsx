import { PageHeader } from "@/components/layout/PageHeader";
import { StoresBrowser } from "@/components/stores/StoresBrowser";
import { StatCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { hasGooglePlacesKey } from "@/lib/places";
import { getBrandsForFilter } from "@/lib/queries/scraper";
import { getStores } from "@/lib/queries/stores";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tiendas · Emer Admin" };

const HEADER = (
  <PageHeader
    title="Tiendas físicas"
    description="Puntos de venta de cada marca. La app y la web enseñan las activas en el mapa y en la ficha de la marca."
  />
);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const brandParam =
    typeof params.brand === "string" && UUID.test(params.brand) ? params.brand : null;

  const [storesResult, brandsResult] = await Promise.all([getStores(), getBrandsForFilter()]);

  if (!storesResult.ok) {
    return (
      <>
        {HEADER}
        <EmptyState
          tone="error"
          title="No se han podido cargar las tiendas"
          description={storesResult.error}
        />
      </>
    );
  }

  const stores = storesResult.data;
  const brands = brandsResult.ok ? brandsResult.data : [];
  const active = stores.filter((store) => store.isActive).length;
  const brandsWithStore = new Set(stores.map((store) => store.brandId)).size;
  const cities = new Set(stores.map((store) => store.city.trim().toLowerCase())).size;

  return (
    <>
      {HEADER}

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Tiendas" value={formatNumber(stores.length)} />
          <StatCard
            label="Activas"
            value={formatNumber(active)}
            tone="ok"
            detail={stores.length > active ? `${stores.length - active} ocultas` : undefined}
          />
          <StatCard
            label="Marcas con tienda"
            value={formatNumber(brandsWithStore)}
            detail={brands.length > 0 ? `de ${formatNumber(brands.length)}` : undefined}
          />
          <StatCard label="Ciudades" value={formatNumber(cities)} />
        </div>

        {!brandsResult.ok ? (
          <p className="border-error/25 bg-error-soft text-error rounded-lg border p-3 text-xs">
            No se han podido cargar las marcas: {brandsResult.error}
          </p>
        ) : null}

        <StoresBrowser
          stores={stores}
          brands={brands}
          hasGoogleKey={hasGooglePlacesKey()}
          initialBrand={brandParam}
          openNew={params.new === "1"}
        />
      </div>
    </>
  );
}
