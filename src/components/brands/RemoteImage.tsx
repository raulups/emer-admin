"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export interface RemoteImageProps {
  src: string | null | undefined;
  alt: string;
  /** Texto del hueco cuando no hay imagen o no carga. */
  fallbackLabel?: string;
  className?: string;
  /** `contain` para logos, `cover` para imagenes de portada. */
  fit?: "cover" | "contain";
  /** Dimensiones reales, si se conocen: evitan saltos de layout al cargar. */
  width?: number | null;
  height?: number | null;
  /** `eager` para la imagen principal, que es visible desde el principio. */
  loading?: "lazy" | "eager";
}

/**
 * Imagen remota (CDN de Shopify y similares) con hueco de reserva si la URL
 * esta vacia o la carga falla. Se usa `<img>` a proposito: las URLs son de
 * dominios arbitrarios y necesitamos el `onError` para el fallback en vivo.
 */
export function RemoteImage({
  src,
  alt,
  fallbackLabel = "Sin imagen",
  className,
  fit = "cover",
  width,
  height,
  loading = "lazy",
}: RemoteImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const trimmed = src?.trim() ?? "";
  const broken = trimmed === "" || failedSrc === trimmed;

  if (broken) {
    return (
      <div
        className={cn(
          "border-ink/30 bg-cream flex items-center justify-center border-2 border-dashed",
          className,
        )}
      >
        <span className="text-ink/40 px-2 text-center text-[10px] font-bold tracking-widest uppercase">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trimmed}
      alt={alt}
      width={width ?? undefined}
      height={height ?? undefined}
      loading={loading}
      onError={() => setFailedSrc(trimmed)}
      className={cn("bg-cream", fit === "cover" ? "object-cover" : "object-contain", className)}
    />
  );
}
