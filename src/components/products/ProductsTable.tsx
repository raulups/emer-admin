"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { RemoteImage } from "@/components/brands/RemoteImage";
import { Badge } from "@/components/ui/Badge";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { cn, formatPrice, formatRelativeTime } from "@/lib/utils";
import { GENDER_LABELS, type ProductListItem } from "@/types/products";

const HEX6 = /^[0-9a-fA-F]{6}$/;

/** `color_hex` se guarda SIN almohadilla: se le añade para pintarlo. */
function ColorCell({ hex, name }: { hex: string | null; name: string | null }) {
  const value = hex?.trim().replace(/^#/, "") ?? "";
  const valid = HEX6.test(value);

  if (!valid && !name) return <span className="text-ink/30">—</span>;

  return (
    <span className="flex items-center gap-1.5">
      {valid ? (
        <span
          aria-hidden
          className="border-ink size-3.5 shrink-0 border-2"
          style={{ backgroundColor: `#${value}` }}
          title={`#${value.toUpperCase()}`}
        />
      ) : null}
      <span className="truncate text-xs">{name ?? `#${value.toUpperCase()}`}</span>
    </span>
  );
}

function PriceCell({ product }: { product: ProductListItem }) {
  const onSale = product.is_on_sale === true && product.original_price !== null;

  return (
    <span className="flex flex-col items-end leading-tight">
      <span className="font-bold whitespace-nowrap">
        {formatPrice(product.current_price, product.currency)}
      </span>
      {onSale ? (
        <span className="text-ink/50 text-[11px] whitespace-nowrap line-through">
          {formatPrice(product.original_price, product.currency)}
        </span>
      ) : null}
    </span>
  );
}

function ProductRow({ product }: { product: ProductListItem }) {
  const router = useRouter();
  const href = `/products/${product.id}`;

  return (
    <TR
      interactive
      className="cursor-pointer"
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter") router.push(href);
      }}
      tabIndex={0}
      role="link"
    >
      <TD>
        <RemoteImage
          src={product.thumbnail_image_url ?? product.main_image_url}
          alt={product.name ?? "Producto"}
          fallbackLabel="—"
          className="border-ink size-10 border-2"
        />
      </TD>

      <TD className="max-w-xs">
        {/* Enlace real dentro de la fila: permite abrir en otra pestaña y navegar con teclado. */}
        <Link
          href={href}
          onClick={(event) => event.stopPropagation()}
          className="block truncate font-bold hover:underline"
        >
          {product.name ?? "(sin nombre)"}
        </Link>
      </TD>

      <TD className="whitespace-nowrap">{product.brandName ?? "—"}</TD>

      <TD>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          {product.categoryName ? (
            <Badge tone="muted">{product.categoryName}</Badge>
          ) : (
            <Badge tone="error">Sin categoría</Badge>
          )}
          {product.category_locked ? (
            <span title="Categoría fijada a mano: el scraper no la cambia" aria-label="Bloqueada">
              🔒
            </span>
          ) : null}
        </span>
      </TD>

      <TD className="max-w-32">
        <span className="text-ink/70 block truncate text-xs">{product.product_type || "—"}</span>
      </TD>

      <TD className="text-xs whitespace-nowrap">
        {product.gender ? GENDER_LABELS[product.gender] : <span className="text-ink/30">—</span>}
      </TD>

      <TD className="max-w-28">
        <ColorCell hex={product.color_hex} name={product.color_name} />
      </TD>

      <TD className="text-right">
        <PriceCell product={product} />
      </TD>

      <TD className="text-center">
        <span
          className={cn(
            "text-xs font-bold",
            product.available === true
              ? "text-ok"
              : product.available === false
                ? "text-error"
                : "text-ink/30",
          )}
        >
          {product.available === true ? "Sí" : product.available === false ? "No" : "—"}
        </span>
      </TD>

      <TD className="text-right whitespace-nowrap">
        {product.sizesTotal === 0 ? (
          <span className="text-ink/30">—</span>
        ) : (
          <span className={product.sizesAvailable === 0 ? "text-error" : undefined}>
            <span className="font-bold">{product.sizesAvailable}</span>
            <span className="text-ink/50">/{product.sizesTotal}</span>
          </span>
        )}
      </TD>

      <TD className="text-ink/60 text-xs whitespace-nowrap">
        {formatRelativeTime(product.last_seen_at)}
      </TD>
    </TR>
  );
}

export function ProductsTable({ products }: { products: ProductListItem[] }) {
  return (
    <TableWrapper>
      <Table>
        <THead>
          <TR>
            <TH>Img</TH>
            <TH>Nombre</TH>
            <TH>Marca</TH>
            <TH>Categoría</TH>
            <TH>Product type</TH>
            <TH>Género</TH>
            <TH>Color</TH>
            <TH className="text-right">Precio</TH>
            <TH className="text-center">Disp.</TH>
            <TH className="text-right">Tallas</TH>
            <TH>Visto</TH>
          </TR>
        </THead>
        <TBody>
          {products.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </TBody>
      </Table>
    </TableWrapper>
  );
}
