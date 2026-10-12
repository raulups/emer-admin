"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { LoadingBlock } from "@/components/ui/Spinner";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { formatNumber } from "@/lib/utils";
import type { ReviewGroup } from "@/types/classification";
import type { Brand, Category } from "@/types/db";

export interface ReviewTabProps {
  brands: Array<Pick<Brand, "id" | "name">>;
  categories: Array<Pick<Category, "id" | "name">>;
}

/**
 * Agregado marca × product_type × categoría, marca a marca.
 *
 * Se carga bajo demanda desde `/api/classification/review`: agregar el
 * catálogo entero no es viable porque PostgREST no agrupa.
 */
export function ReviewTab({ brands, categories }: ReviewTabProps) {
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [groups, setGroups] = useState<ReviewGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // `useTransition` da el estado de carga sin tener que llamar a setState
  // de forma sincrona dentro del efecto.
  const [loading, startLoading] = useTransition();

  const load = useCallback(async (brand: string) => {
    const response = await fetch(`/api/classification/review?brand=${brand}`, {
      cache: "no-store",
    });
    const payload: unknown = await response.json();

    if (!payload || typeof payload !== "object" || !("ok" in payload) || !payload.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : `El servidor ha respondido ${response.status}.`;
      throw new Error(message);
    }

    return (payload as unknown as { groups: ReviewGroup[] }).groups;
  }, []);

  useEffect(() => {
    if (brandId === "") return;

    let cancelled = false;

    startLoading(async () => {
      try {
        const next = await load(brandId);
        if (cancelled) return;
        setGroups(next);
        setError(null);
      } catch (loadError) {
        if (cancelled) return;
        setGroups(null);
        setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [brandId, load]);

  const visible = useMemo(() => {
    if (!groups) return [];
    if (categoryFilter === "") return groups;
    return groups.filter((group) => group.categoryId === categoryFilter);
  }, [groups, categoryFilter]);

  const totalProducts = visible.reduce((sum, group) => sum + group.count, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="border-ink bg-cream border-2 p-2 text-xs">
        Cada fila es un <strong>product_type</strong> de la marca y la categoría a la que ha ido a
        parar. Si una misma columna de la izquierda aparece con dos categorías distintas, ahí hay
        algo que revisar. Se consulta marca a marca porque la base no sabe agrupar por sí sola.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Marca"
          value={brandId}
          onChange={(event) => setBrandId(event.target.value)}
          options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
          wrapperClassName="w-60"
        />
        <Select
          label="Categoría"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          placeholder="Todas"
          options={categories.map((category) => ({ value: category.id, label: category.name }))}
          wrapperClassName="w-56"
        />
        <p className="text-ink/60 pb-2 text-xs">
          {formatNumber(visible.length)} {visible.length === 1 ? "combinación" : "combinaciones"} ·{" "}
          {formatNumber(totalProducts)} productos
        </p>
      </div>

      {error ? (
        <EmptyState tone="error" title="No se ha podido cargar la revisión" description={error} />
      ) : loading ? (
        <LoadingBlock text="Agrupando los productos de la marca…" />
      ) : visible.length === 0 ? (
        <div className="border-ink bg-paper border-2 p-8 text-center">
          <p className="text-ink/60 text-sm">
            Esta marca no tiene productos clasificados con esos filtros.
          </p>
        </div>
      ) : (
        <TableWrapper className="shadow-none">
          <Table>
            <THead>
              <TR>
                <TH>product_type</TH>
                <TH>Categoría asignada</TH>
                <TH className="text-right">Productos</TH>
                <TH>Ejemplo</TH>
              </TR>
            </THead>
            <TBody>
              {visible.map((group) => {
                const href = `/products?brand=${group.brandId}${
                  group.categoryId ? `&category=${group.categoryId}` : ""
                }`;
                return (
                  <TR key={`${group.productType}|${group.categoryId}`} interactive>
                    <TD>
                      <Link href={href} className="block">
                        {group.productType ? (
                          <span className="font-mono text-xs">{group.productType}</span>
                        ) : (
                          <span className="text-ink/40 text-xs">(sin product_type)</span>
                        )}
                      </Link>
                    </TD>
                    <TD>
                      <Link href={href} className="block">
                        {group.categoryName ? (
                          <Badge tone="muted">{group.categoryName}</Badge>
                        ) : (
                          <Badge tone="error">Sin categoría</Badge>
                        )}
                      </Link>
                    </TD>
                    <TD className="text-right font-bold">
                      <Link href={href} className="block">
                        {formatNumber(group.count)}
                      </Link>
                    </TD>
                    <TD>
                      {group.sample ? (
                        <Link
                          href={`/products/${group.sample.id}`}
                          className="decoration-ink/30 hover:decoration-ink text-xs underline"
                        >
                          {group.sample.name ?? "(sin nombre)"}
                        </Link>
                      ) : (
                        <span className="text-ink/30">—</span>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableWrapper>
      )}
    </div>
  );
}
