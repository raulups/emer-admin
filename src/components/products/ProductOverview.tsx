import Link from "next/link";

import { Gallery } from "@/components/products/Gallery";
import { PriceHistoryChart } from "@/components/products/PriceHistoryChart";
import { SizesPanel } from "@/components/products/SizesPanel";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { buildGalleryImages } from "@/lib/gallery";
import { formatDateTime, formatPrice, percentOf } from "@/lib/utils";
import type { ProductDetailData } from "@/types/products";
import { GENDER_LABELS } from "@/types/products";

const HEX6 = /^[0-9a-fA-F]{6}$/;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-ink/10 flex flex-col gap-0.5 border-b-2 py-1.5 last:border-b-0">
      <dt className="label-caps text-ink/50">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

function Empty() {
  return <span className="text-ink/30">—</span>;
}

/** Pestaña VISTA: lectura humana del producto. */
export function ProductOverview({ detail }: { detail: ProductDetailData }) {
  const { product, brand, sizes, priceHistory } = detail;

  const images = buildGalleryImages(product.images, product.image_urls, product.main_image_url);

  const onSale = product.is_on_sale === true && product.original_price !== null;
  const discount =
    onSale && product.original_price && product.current_price !== null
      ? 100 - percentOf(product.current_price, product.original_price)
      : null;

  const rangeDiffers =
    product.min_price !== null &&
    product.max_price !== null &&
    product.min_price !== product.max_price;

  const attributes = product.attributes ?? {};
  const attrBadges = Array.isArray(attributes.badges) ? attributes.badges : [];
  const attrOptions = Array.isArray(attributes.options) ? attributes.options : [];
  const attrColors = Array.isArray(attributes.colors) ? attributes.colors : [];
  const tags = product.tags ?? [];

  const colorHex = product.color_hex?.trim().replace(/^#/, "") ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* Galeria */}
        <Gallery images={images} alt={product.name ?? "Producto"} />

        {/* Precio + tallas */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Precio" />
            <CardBody className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-4xl leading-none font-bold tracking-tighter">
                  {formatPrice(product.current_price, product.currency)}
                </span>
                {onSale ? (
                  <>
                    <span className="text-ink/50 text-lg line-through">
                      {formatPrice(product.original_price, product.currency)}
                    </span>
                    {discount !== null && discount > 0 ? (
                      <Badge tone="error">−{discount}%</Badge>
                    ) : null}
                  </>
                ) : null}
              </div>

              <dl className="grid grid-cols-2 gap-x-6 text-xs sm:grid-cols-3">
                <Row label="Moneda">{product.currency ?? <Empty />}</Row>
                {rangeDiffers ? (
                  <Row label="Rango">
                    {formatPrice(product.min_price, product.currency)} –{" "}
                    {formatPrice(product.max_price, product.currency)}
                  </Row>
                ) : null}
                <Row label="Disponible">
                  {product.available === true ? (
                    <span className="text-ok font-bold">Sí</span>
                  ) : product.available === false ? (
                    <span className="text-error font-bold">No</span>
                  ) : (
                    <Empty />
                  )}
                </Row>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Tallas" />
            <CardBody>
              <SizesPanel sizes={sizes} currency={product.currency} />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Atributos */}
      <Card>
        <CardHeader title="Atributos" />
        <CardBody>
          <dl className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
            <Row label="Género">{product.gender ? GENDER_LABELS[product.gender] : <Empty />}</Row>

            <Row label="Color">
              {colorHex || product.color_name ? (
                <span className="flex items-center gap-2">
                  {HEX6.test(colorHex) ? (
                    <span
                      aria-hidden
                      className="border-ink size-4 border-2"
                      style={{ backgroundColor: `#${colorHex}` }}
                    />
                  ) : null}
                  <span>{product.color_name ?? "—"}</span>
                  {colorHex ? (
                    <span className="text-ink/50 font-mono text-xs">#{colorHex.toUpperCase()}</span>
                  ) : null}
                </span>
              ) : (
                <Empty />
              )}
            </Row>

            <Row label="Product type">{product.product_type || <Empty />}</Row>
            <Row label="Vendor">{product.vendor || <Empty />}</Row>
            <Row label="Marca">
              {brand ? (
                <Link href={`/brands/${brand.id}`} className="underline">
                  {brand.name}
                </Link>
              ) : (
                <Empty />
              )}
            </Row>
            <Row label="Handle">
              <span className="font-mono text-xs">{product.handle || "—"}</span>
            </Row>
            <Row label="external_id (Shopify)">
              <span className="font-mono text-xs">{product.external_id || "—"}</span>
            </Row>

            <Row label="Tags">
              {tags.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} tone="muted">
                      {tag}
                    </Badge>
                  ))}
                </span>
              ) : (
                <Empty />
              )}
            </Row>

            <Row label="Badges (attributes)">
              {attrBadges.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {attrBadges.map((badge) => (
                    <Badge key={String(badge)} tone="neutral">
                      {String(badge)}
                    </Badge>
                  ))}
                </span>
              ) : (
                <Empty />
              )}
            </Row>

            <Row label="Colores (attributes)">
              {attrColors.length > 0 ? attrColors.map(String).join(", ") : <Empty />}
            </Row>
          </dl>

          {attrOptions.length > 0 ? (
            <div className="border-ink mt-3 border-t-2 pt-3">
              <span className="label-caps text-ink/60">Options</span>
              <ul className="mt-1.5 flex flex-col gap-1">
                {attrOptions.map((option, index) => (
                  <li key={`${option?.name ?? index}`} className="text-sm">
                    <span className="font-bold">{option?.name ?? "—"}</span>
                    <span className="text-ink/50"> → </span>
                    <span>{(option?.values ?? []).join(", ") || "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border-ink mt-3 border-t-2 pt-3">
            <span className="label-caps text-ink/60">Fechas</span>
            <dl className="mt-1.5 grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
              <Row label="published_at">{formatDateTime(product.published_at)}</Row>
              <Row label="source_created_at">{formatDateTime(product.source_created_at)}</Row>
              <Row label="source_updated_at">{formatDateTime(product.source_updated_at)}</Row>
              <Row label="last_seen_at">{formatDateTime(product.last_seen_at)}</Row>
              <Row label="created_at">{formatDateTime(product.created_at)}</Row>
              <Row label="updated_at">{formatDateTime(product.updated_at)}</Row>
            </dl>
          </div>
        </CardBody>
      </Card>

      {/* Descripcion */}
      <Card>
        <CardHeader title="Descripción" />
        <CardBody>
          {product.description?.trim() ? (
            <p className="max-w-prose text-sm whitespace-pre-line">{product.description}</p>
          ) : (
            <p className="text-ink/50 text-sm">Este producto no tiene descripción.</p>
          )}
        </CardBody>
      </Card>

      {/* Historial de precio */}
      <Card>
        <CardHeader title="Historial de precio" />
        <CardBody>
          <PriceHistoryChart history={priceHistory} currency={product.currency} />
        </CardBody>
      </Card>
    </div>
  );
}
