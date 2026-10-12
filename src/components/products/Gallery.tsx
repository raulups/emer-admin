"use client";

import { useState } from "react";

import { RemoteImage } from "@/components/brands/RemoteImage";
import type { GalleryImage } from "@/lib/gallery";
import { cn } from "@/lib/utils";

export function Gallery({ images, alt }: { images: GalleryImage[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  if (!current) {
    return (
      <div className="border-ink/30 bg-cream flex aspect-square w-full items-center justify-center border-2 border-dashed">
        <span className="label-caps text-ink/40">Sin imágenes</span>
      </div>
    );
  }

  // Si se conocen las dimensiones se reserva su proporcion exacta; si no, un
  // cuadrado. En ambos casos el hueco existe antes de cargar la imagen.
  const ratio = current.width && current.height ? `${current.width} / ${current.height}` : "1 / 1";

  return (
    <div className="flex flex-col gap-2">
      <div className="border-ink bg-paper border-2" style={{ aspectRatio: ratio }}>
        <RemoteImage
          key={current.src}
          src={current.src}
          alt={alt}
          width={current.width}
          height={current.height}
          loading="eager"
          fit="contain"
          fallbackLabel="No se ha podido cargar la imagen"
          className="h-full w-full"
        />
      </div>

      {images.length > 1 ? (
        <ul className="flex flex-wrap gap-2">
          {images.map((image, position) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-current={position === index}
                aria-label={`Imagen ${position + 1} de ${images.length}`}
                className={cn(
                  "block cursor-pointer border-2 transition-colors duration-[120ms]",
                  position === index ? "border-ink bg-ink" : "border-ink/30 hover:border-ink",
                )}
              >
                <RemoteImage
                  src={image.src}
                  alt=""
                  fallbackLabel="—"
                  fit="cover"
                  className="size-14"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-ink/50 text-[11px]">
        {images.length} {images.length === 1 ? "imagen" : "imágenes"}
        {current.width && current.height ? ` · ${current.width}×${current.height}` : ""}
      </p>
    </div>
  );
}
