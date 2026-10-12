import type { ProductImage } from "@/types/db";

export interface GalleryImage {
  src: string;
  width: number | null;
  height: number | null;
}

/**
 * Construye la lista de imagenes a partir de las tres fuentes del producto.
 * `images` trae dimensiones (lo ideal, evita saltos de layout) pero casi
 * siempre viene vacia, asi que se completa con `image_urls` y `main_image_url`.
 *
 * Vive en `lib/` y no en el componente porque lo llama un Server Component:
 * una funcion exportada desde un modulo "use client" no se puede invocar
 * desde el servidor.
 */
export function buildGalleryImages(
  images: ProductImage[] | null,
  imageUrls: string[] | null,
  mainImageUrl: string | null,
): GalleryImage[] {
  const result: GalleryImage[] = [];
  const seen = new Set<string>();

  const push = (src: string | null | undefined, width: number | null, height: number | null) => {
    const value = src?.trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    result.push({ src: value, width, height });
  };

  push(mainImageUrl, null, null);
  for (const image of images ?? []) push(image?.src, image?.width ?? null, image?.height ?? null);
  for (const url of imageUrls ?? []) push(url, null, null);

  return result;
}
