"use client";

import { useOptimistic, useTransition } from "react";

import { updateBrandTags } from "@/app/brands/actions";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { BRAND_TAG_DESCRIPTIONS } from "@/lib/validation/brand";
import { BRAND_TAGS, type BrandTag, type Uuid } from "@/types/db";

/**
 * Chips de tags editables desde la vista previa: un clic activa o quita el
 * tag y se guarda al momento (con actualizacion optimista).
 */
export function QuickTags({
  brandId,
  brandName,
  tags,
  size = "md",
}: {
  brandId: Uuid;
  brandName: string;
  tags: BrandTag[];
  size?: "sm" | "md";
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(tags);

  function toggle(tag: BrandTag) {
    const next = optimistic.includes(tag)
      ? optimistic.filter((item) => item !== tag)
      : [...optimistic, tag];

    startTransition(async () => {
      setOptimistic(next);
      const result = await updateBrandTags(brandId, next);
      if (!result.ok)
        showToast(`No se han podido guardar los tags de ${brandName}: ${result.error}`, "error");
    });
  }

  return (
    <div
      className={cn("flex flex-wrap gap-1", pending && "opacity-70")}
      aria-label={`Tags de ${brandName}`}
      aria-busy={pending}
    >
      {BRAND_TAGS.map((tag) => {
        const active = optimistic.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggle(tag);
            }}
            aria-pressed={active}
            title={`${active ? "Quitar" : "Añadir"} «${tag}»: ${BRAND_TAG_DESCRIPTIONS[tag]}`}
            className={cn(
              "cursor-pointer border-2 font-bold tracking-widest uppercase transition-colors duration-[120ms]",
              size === "sm" ? "px-1 py-px text-[9px]" : "px-1.5 py-0.5 text-[10px]",
              active
                ? "border-ink bg-ink text-cream"
                : "border-ink/25 bg-paper text-ink/35 hover:border-ink hover:bg-cream hover:text-ink",
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
