import { JsonViewer } from "@/components/products/JsonViewer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { fetchShopifyProduct } from "@/lib/queries/products";

/**
 * Pide el JSON original a la tienda (Server Component asincrono).
 * Va dentro de un `<Suspense>`: la pagina se pinta sin esperar a la tienda.
 */
export async function ShopifyJsonTab({
  productUrl,
  handle,
}: {
  productUrl: string | null;
  handle: string | null;
}) {
  const result = await fetchShopifyProduct(productUrl);

  if (!result.ok) {
    return (
      <EmptyState
        tone="error"
        title="No se ha podido leer el JSON de la tienda"
        description={`${result.error}${result.url ? `\n\n${result.url}` : ""}`}
      />
    );
  }

  return (
    <JsonViewer
      value={result.data}
      filename={`shopify-${handle ?? "producto"}`}
      note={result.url}
      defaultDepth={3}
    />
  );
}

/** Esqueleto mientras se espera a la tienda (hasta 10 s). */
export function ShopifyJsonSkeleton() {
  return (
    <div className="border-ink bg-paper flex flex-col items-center justify-center gap-3 border-2 p-10">
      <Spinner size="lg" />
      <p className="label-caps text-ink/60">Pidiendo el JSON a la tienda…</p>
      <p className="text-ink/50 text-xs">Se cancela a los 10 segundos.</p>
    </div>
  );
}
