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
              "cursor-pointer rounded-full border font-medium transition-colors duration-150",
              size === "sm" ? "px-1.5 py-px text-[11px]" : "px-2 py-0.5 text-xs",
              active
                ? "border-accent/40 bg-accent-soft text-accent"
                : "border-line bg-paper text-ink/40 hover:border-line-strong hover:text-ink",
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
