"use client";

import { useMemo, useState } from "react";

import { BrandCard } from "@/components/brands/BrandCard";
import { BrandsTable } from "@/components/brands/BrandsTable";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useStoredOption } from "@/lib/use-local-storage";
import { cn, formatNumber } from "@/lib/utils";
import { BRAND_TAG_DESCRIPTIONS } from "@/lib/validation/brand";
import {
  BRAND_SORTS,
  BRAND_SORT_LABELS,
  BRAND_VIEW_MODES,
  type BrandListItem,
  type BrandSort,
  type BrandViewMode,
} from "@/types/brands";
import { BRAND_TAGS, type BrandTag } from "@/types/db";

const VIEW_STORAGE_KEY = "emer-admin:brands:view";

/** Normaliza para buscar sin tildes ni mayusculas. */
function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function BrandsBrowser({
  brands,
  countsAvailable,
}: {
  brands: BrandListItem[];
  countsAvailable: boolean;
}) {
  const [view, setView] = useStoredOption<BrandViewMode>(
    VIEW_STORAGE_KEY,
    "grid",
    BRAND_VIEW_MODES,
  );
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<BrandTag[]>([]);
  const [sort, setSort] = useState<BrandSort>("name");

  function toggleTag(tag: BrandTag) {
    setActiveTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  function clearFilters() {
    setQuery("");
    setActiveTags([]);
    setSort("name");
  }

  const visible = useMemo(() => {
    const needle = normalize(query.trim());

    const filtered = brands.filter((brand) => {
      if (needle !== "" && !normalize(brand.name).includes(needle)) return false;
      // Multiseleccion de tags: la marca debe tener TODOS los seleccionados.
      if (activeTags.length > 0 && !activeTags.every((tag) => brand.tags.includes(tag))) {
        return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "es");
      if (sort === "created_at") {
        return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      }
      return (b.productsCount ?? 0) - (a.productsCount ?? 0);
    });
  }, [brands, query, activeTags, sort]);

  const filtersActive = query.trim() !== "" || activeTags.length > 0 || sort !== "name";

  return (
    <div className="flex flex-col gap-4">
      {/* Controles */}
      <div className="border-ink bg-paper shadow-hard flex flex-col gap-3 border-2 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Buscar por nombre"
            placeholder="Nombre de la marca…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            wrapperClassName="min-w-56 flex-1"
            autoComplete="off"
          />

          <Select
            label="Ordenar por"
            value={sort}
            onChange={(event) => setSort(event.target.value as BrandSort)}
            options={BRAND_SORTS.map((value) => ({ value, label: BRAND_SORT_LABELS[value] }))}
            wrapperClassName="w-60"
          />

          <div className="flex flex-col gap-1.5">
            <span className="label-caps">Vista</span>
            <div className="flex">
              {BRAND_VIEW_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  aria-pressed={view === mode}
                  className={cn(
                    "border-ink cursor-pointer border-2 px-3 py-2 text-xs font-bold tracking-widest uppercase transition-colors duration-[120ms]",
                    mode === "table" && "-ml-0.5",
                    view === mode ? "bg-ink text-cream" : "bg-paper hover:bg-cream",
                  )}
                >
                  {mode === "grid" ? "Cards" : "Tabla"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filtro por tag (multiseleccion) */}
        <div className="flex flex-col gap-1.5">
          <span className="label-caps">Filtrar por tag</span>
          <div className="flex flex-wrap gap-1.5">
            {BRAND_TAGS.map((tag) => {
              const active = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  title={BRAND_TAG_DESCRIPTIONS[tag]}
                  className={cn(
                    "border-ink cursor-pointer border-2 px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors duration-[120ms]",
                    active ? "bg-ink text-cream" : "bg-paper hover:bg-cream",
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-ink flex items-center justify-between gap-3 border-t-2 pt-2.5">
          <p className="text-ink/60 text-xs">
            {formatNumber(visible.length)} de {formatNumber(brands.length)}{" "}
            {brands.length === 1 ? "marca" : "marcas"}
            {activeTags.length > 1 ? " · con todos los tags seleccionados" : ""}
          </p>
          {filtersActive ? (
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </div>

      {!countsAvailable ? (
        <p className="border-error bg-paper text-error border-2 p-3 text-xs">
          No se han podido calcular los contadores de productos. Se muestran las marcas sin
          contadores.
        </p>
      ) : null}

      {/* Resultados */}
      {visible.length === 0 ? (
        <EmptyState
          title={brands.length === 0 ? "Todavía no hay marcas" : "Sin resultados"}
          description={
            brands.length === 0
              ? "Crea la primera marca para que el scraper empiece a traer productos."
              : "Ninguna marca coincide con la búsqueda y los filtros activos."
          }
          action={
            filtersActive ? (
              <Button variant="secondary" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : null
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      ) : (
        <BrandsTable brands={visible} />
      )}
    </div>
  );
}
