"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BrandCard } from "@/components/brands/BrandCard";
import { BrandQuickEditModal } from "@/components/brands/BrandQuickEditModal";
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
import { BRAND_TAGS, type BrandTag, type Uuid } from "@/types/db";

const VIEW_STORAGE_KEY = "emer-admin:brands:view";

/** Normaliza para buscar sin tildes ni mayusculas. */
function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Marca con algo que revisar: sin tienda, sin imagenes, productos sin categoria o ultimo scrape fallido. */
function needsAttention(brand: BrandListItem): boolean {
  return (
    !brand.url ||
    !brand.img_desktop ||
    !brand.img_mobile ||
    !brand.logo ||
    (brand.unclassifiedCount ?? 0) > 0 ||
    brand.lastRun?.status === "error" ||
    brand.lastRun?.status === "partial"
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function chipClasses(active: boolean): string {
  return cn(
    "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150",
    active
      ? "border-accent/40 bg-accent-soft text-accent"
      : "border-line bg-paper text-ink/70 hover:border-line-strong hover:text-ink",
  );
}

export function BrandsBrowser({
  brands,
  countsAvailable,
}: {
  brands: BrandListItem[];
  countsAvailable: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useStoredOption<BrandViewMode>(
    VIEW_STORAGE_KEY,
    "grid",
    BRAND_VIEW_MODES,
  );
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<BrandTag[]>([]);
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [sort, setSort] = useState<BrandSort>("name");

  const editId = searchParams.get("edit");
  const creating = searchParams.get("new") === "1";
  const editing = editId ? (brands.find((brand) => brand.id === editId) ?? null) : null;
  const modalOpen = creating || editing !== null;

  const setModalParam = useCallback(
    (key: "edit" | "new" | null, value?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("edit");
      params.delete("new");
      if (key) params.set(key, value ?? "1");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openEdit = useCallback((id: Uuid) => setModalParam("edit", id), [setModalParam]);
  const closeModal = useCallback(() => setModalParam(null), [setModalParam]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (modalOpen || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setModalParam("new");
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, setModalParam]);

  function toggleTag(tag: BrandTag) {
    setActiveTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  function clearFilters() {
    setQuery("");
    setActiveTags([]);
    setOnlyAttention(false);
    setSort("name");
  }

  const attentionCount = useMemo(() => brands.filter(needsAttention).length, [brands]);

  const visible = useMemo(() => {
    const needle = normalize(query.trim());

    const filtered = brands.filter((brand) => {
      if (needle !== "" && !normalize(brand.name).includes(needle)) return false;
      if (activeTags.length > 0 && !activeTags.every((tag) => brand.tags.includes(tag))) {
        return false;
      }
      if (onlyAttention && !needsAttention(brand)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "es");
      if (sort === "created_at") {
        return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      }
      return (b.productsCount ?? 0) - (a.productsCount ?? 0);
    });
  }, [brands, query, activeTags, onlyAttention, sort]);

  const filtersActive =
    query.trim() !== "" || activeTags.length > 0 || onlyAttention || sort !== "name";

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-paper/95 z-20 flex flex-col gap-3 rounded-xl border p-3 shadow-xs backdrop-blur lg:sticky lg:top-4">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            ref={searchRef}
            id="brand-search"
            label="Buscar"
            placeholder="Nombre de la marca…  ( / )"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setQuery("");
                event.currentTarget.blur();
              }
              if (event.key === "Enter" && visible.length === 1 && visible[0]) {
                openEdit(visible[0].id);
              }
            }}
            wrapperClassName="min-w-56 flex-1"
            autoComplete="off"
          />

          <Select
            label="Ordenar por"
            value={sort}
            onChange={(event) => setSort(event.target.value as BrandSort)}
            options={BRAND_SORTS.map((value) => ({ value, label: BRAND_SORT_LABELS[value] }))}
            wrapperClassName="w-56"
          />

          <div className="flex flex-col gap-1.5">
            <span className="label-caps">Vista</span>
            <div className="bg-subtle flex h-9 items-center gap-1 rounded-lg p-1">
              {BRAND_VIEW_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  aria-pressed={view === mode}
                  className={cn(
                    "h-7 cursor-pointer rounded-md px-3 text-xs font-medium transition-[background-color,color,box-shadow] duration-150",
                    view === mode ? "bg-paper text-ink shadow-sm" : "text-ink/55 hover:text-ink",
                  )}
                >
                  {mode === "grid" ? "Cards" : "Tabla"}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={() => setModalParam("new")} title="Nueva marca (N)">
            + Nueva marca
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOnlyAttention((current) => !current)}
            aria-pressed={onlyAttention}
            title="Sin tienda, sin imágenes, con productos sin categoría o con el último scrape fallido"
            className={cn(
              "cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150",
              onlyAttention
                ? "border-progress/60 bg-progress-soft text-[#8a5a00]"
                : "border-line bg-paper text-ink/70 hover:border-line-strong hover:text-ink",
            )}
          >
            Por revisar · {formatNumber(attentionCount)}
          </button>
          <span aria-hidden className="bg-ink/20 mx-1 h-5 w-0.5" />
          {BRAND_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              aria-pressed={activeTags.includes(tag)}
              title={BRAND_TAG_DESCRIPTIONS[tag]}
              className={chipClasses(activeTags.includes(tag))}
            >
              {tag}
            </button>
          ))}

          <span className="text-ink/60 ml-auto text-xs">
            {formatNumber(visible.length)} de {formatNumber(brands.length)}{" "}
            {brands.length === 1 ? "marca" : "marcas"}
          </span>
          {filtersActive ? (
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Limpiar
            </Button>
          ) : null}
        </div>
      </div>

      {!countsAvailable ? (
        <p className="border-error/25 bg-error-soft text-error rounded-lg border p-3 text-xs">
          No se han podido calcular los contadores de productos. Se muestran las marcas sin
          contadores.
        </p>
      ) : null}

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
            ) : (
              <Button onClick={() => setModalParam("new")}>Nueva marca</Button>
            )
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((brand) => (
            <BrandCard key={brand.id} brand={brand} onEdit={() => openEdit(brand.id)} />
          ))}
        </div>
      ) : (
        <BrandsTable brands={visible} onEdit={openEdit} />
      )}

      <p className="text-ink/40 text-[11px]">
        Atajos: <kbd className="font-semibold">/</kbd> buscar ·{" "}
        <kbd className="font-semibold">N</kbd> nueva marca ·{" "}
        <kbd className="font-semibold">Enter</kbd> en el buscador abre la única coincidencia ·{" "}
        <kbd className="font-semibold">Esc</kbd> cierra el pop-up.
      </p>

      <BrandQuickEditModal
        brand={creating ? null : editing}
        open={modalOpen}
        onClose={closeModal}
      />
    </div>
  );
}
