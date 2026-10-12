"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { CLASSIFY_SOURCE_LABELS, classifyProduct, prep, type ClassifyRule } from "@/lib/classify";
import type { Category } from "@/types/db";

export interface RuleTesterProps {
  rules: ClassifyRule[];
  categories: Array<Pick<Category, "id" | "name">>;
}

/**
 * Prueba la clasificacion sin tocar nada: escribe un titulo y un product_type
 * y enseña qué regla gana. Usa las mismas funciones que `classifyProduct`,
 * que a su vez replican el nodo de n8n.
 */
export function RuleTester({ rules, categories }: RuleTesterProps) {
  const [title, setTitle] = useState("");
  const [productType, setProductType] = useState("");

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const result = useMemo(() => {
    if (title.trim() === "" && productType.trim() === "") return null;
    return classifyProduct({ title, productType, tags: [] }, { rules });
  }, [title, productType, rules]);

  return (
    <div className="border-ink bg-paper flex flex-col gap-3 border-2 p-3">
      <div>
        <h3 className="text-sm tracking-wider">Probador</h3>
        <p className="text-ink/60 mt-0.5 text-xs">
          Escribe un título y un product_type y verás qué regla ganaría, sin guardar nada.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Título del producto"
          placeholder="Short Sleeve Shirt Black"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoComplete="off"
        />
        <Input
          label="product_type"
          placeholder="Man Jacket"
          value={productType}
          onChange={(event) => setProductType(event.target.value)}
          autoComplete="off"
        />
      </div>

      {result === null ? (
        <p className="text-ink/40 text-xs">Escribe algo para ver el resultado.</p>
      ) : (
        <div className="border-ink bg-cream flex flex-col gap-2 border-2 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-caps text-ink/60">Categoría resultante</span>
            {result.categoryId ? (
              <Badge tone="ok">{categoryNames.get(result.categoryId) ?? "(desconocida)"}</Badge>
            ) : (
              <Badge tone="error">Sin categoría</Badge>
            )}
          </div>

          <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            <div className="flex gap-1.5">
              <dt className="label-caps text-ink/50">Ha decidido</dt>
              <dd>{CLASSIFY_SOURCE_LABELS[result.source]}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="label-caps text-ink/50">Regla</dt>
              <dd>
                {result.rule ? (
                  <>
                    <span className="font-mono font-bold">{result.rule.keyword}</span>
                    <span className="text-ink/50"> · prioridad {result.rule.priority}</span>
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>

          <div className="border-ink/20 text-ink/60 grid gap-x-6 gap-y-1 border-t-2 pt-2 text-[11px] sm:grid-cols-2">
            <div>
              <span className="label-caps text-ink/40">Título normalizado</span>
              <p className="font-mono break-words">{prep(title) || "—"}</p>
            </div>
            <div>
              <span className="label-caps text-ink/40">product_type normalizado</span>
              <p className="font-mono break-words">{prep(productType) || "—"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
