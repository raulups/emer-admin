"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { buildProductsQuery, hasActiveFilters, type FilterKey } from "@/lib/product-filters";
import { formatNumber } from "@/lib/utils";
import type { Brand, Category } from "@/types/db";
import { GENDERS } from "@/types/db";
import {
  GENDER_LABELS,
  NONE_VALUE,
  PRODUCT_SORTS,
  PRODUCT_SORT_LABELS,
  type ProductFilters,
} from "@/types/products";

export interface ProductsFiltersProps {
  filters: ProductFilters;
  brands: Array<Pick<Brand, "id" | "name">>;
  categories: Array<Pick<Category, "id" | "name">>;
  total: number;
}

/** Milisegundos de espera antes de buscar mientras se teclea. */
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Barra de filtros. Todo vive en la URL (searchParams), asi que cualquier
 * combinacion se puede compartir o recargar.
 */
export function ProductsFilters({ filters, brands, categories, total }: ProductsFiltersProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function navigate(changes: Partial<Record<FilterKey | "page", string | null>>) {
    const href = `/products${buildProductsQuery(filters, changes)}`;
    startTransition(() => router.push(href, { scroll: false }));
  }

  function onSearchChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      navigate({ q: value.trim() === "" ? null : value.trim() });
    }, SEARCH_DEBOUNCE_MS);
  }

  function clearAll() {
    if (timer.current) clearTimeout(timer.current);
    setQuery("");
    startTransition(() => router.push("/products", { scroll: false }));
  }

  const active = hasActiveFilters(filters);

  return (
    <div className="border-ink bg-paper shadow-hard mb-4 flex flex-col gap-3 border-2 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Buscar por nombre"
          placeholder="Camiseta, hoodie…"
          value={query}
          onChange={(event) => onSearchChange(event.target.value)}
          wrapperClassName="min-w-56 flex-1"
          autoComplete="off"
        />

        <Select
          label="Marca"
          value={filters.brand ?? ""}
          onChange={(event) => navigate({ brand: event.target.value || null })}
          placeholder="Todas"
          options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
          wrapperClassName="w-48"
        />

        <Select
          label="Categoría"
          value={filters.category ?? ""}
          onChange={(event) => navigate({ category: event.target.value || null })}
          placeholder="Todas"
          wrapperClassName="w-48"
        >
          <option value={NONE_VALUE}>Sin categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        <Select
          label="Género"
          value={filters.gender ?? ""}
          onChange={(event) => navigate({ gender: event.target.value || null })}
          placeholder="Todos"
          wrapperClassName="w-40"
        >
          {GENDERS.map((gender) => (
            <option key={gender} value={gender}>
              {GENDER_LABELS[gender]}
            </option>
          ))}
          <option value={NONE_VALUE}>Sin género</option>
        </Select>

        <Select
          label="Disponible"
          value={filters.available === null ? "" : filters.available ? "1" : "0"}
          onChange={(event) => navigate({ available: event.target.value || null })}
          placeholder="Todos"
          options={[
            { value: "1", label: "Sí" },
            { value: "0", label: "No" },
          ]}
          wrapperClassName="w-32"
        />

        <Select
          label="Rebajas"
          value={filters.onSale === null ? "" : filters.onSale ? "1" : "0"}
          onChange={(event) => navigate({ on_sale: event.target.value || null })}
          placeholder="Todos"
          options={[
            { value: "1", label: "En rebajas" },
            { value: "0", label: "Sin rebaja" },
          ]}
          wrapperClassName="w-36"
        />

        <Select
          label="Ordenar por"
          value={filters.sort}
          onChange={(event) => navigate({ sort: event.target.value })}
          options={PRODUCT_SORTS.map((sort) => ({ value: sort, label: PRODUCT_SORT_LABELS[sort] }))}
          wrapperClassName="w-52"
        />
      </div>

      <div className="border-ink flex items-center justify-between gap-3 border-t-2 pt-2.5">
        <p className="text-ink/60 flex items-center gap-2 text-xs">
          {pending ? <Spinner size="sm" /> : null}
          {formatNumber(total)} {total === 1 ? "producto" : "productos"}
          {active ? " con los filtros activos" : " en total"}
        </p>
        {active ? (
          <Button variant="secondary" size="sm" onClick={clearAll}>
            Limpiar filtros
          </Button>
        ) : null}
      </div>
    </div>
  );
}
