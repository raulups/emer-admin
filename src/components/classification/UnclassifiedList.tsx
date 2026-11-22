"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { setProductCategory, setProductsCategory } from "@/app/products/actions";
import { RemoteImage } from "@/components/brands/RemoteImage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { cn, formatNumber, formatPrice } from "@/lib/utils";
import type { UnclassifiedGroup, UnclassifiedProduct } from "@/types/classification";
import type { Category } from "@/types/db";

/** Valor del filtro de product_type para los productos que no lo traen. */
const EMPTY_TYPE = "__empty__";

/** Filas por pagina: la lista entera son ~3.000 productos. */
const PAGE_SIZE = 50;

interface Row extends UnclassifiedProduct {
  brandId: string;
  brandName: string;
  productType: string;
  productTypeKey: string;
}

export interface UnclassifiedListProps {
  /** Grupos ya sin los productos clasificados en esta sesion. */
  groups: UnclassifiedGroup[];
  categories: Array<Pick<Category, "id" | "name">>;
  onAssigned: (ids: string[]) => void;
}

/**
 * Todos los productos sin categoria en una tabla plana: filtros por marca,
 * product_type y nombre, asignacion fila a fila y en bloque con seleccion.
 */
export function UnclassifiedList({ groups, categories, onAssigned }: UnclassifiedListProps) {
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [productType, setProductType] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [savingRow, setSavingRow] = useState<string | null>(null);

  const rows = useMemo<Row[]>(
    () =>
      groups
        .flatMap((group) =>
          group.products.map((product) => ({
            ...product,
            brandId: group.brandId,
            brandName: group.brandName,
            productType: group.productType,
            productTypeKey: group.productTypeKey,
          })),
        )
        .sort(
          (a, b) =>
            a.brandName.localeCompare(b.brandName, "es") ||
            (a.name ?? "").localeCompare(b.name ?? "", "es"),
        ),
    [groups],
  );

  const brandOptions = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const row of rows) {
      const entry = counts.get(row.brandId) ?? { name: row.brandName, count: 0 };
      entry.count += 1;
      counts.set(row.brandId, entry);
    }
    return [...counts.entries()]
      .sort((a, b) => a[1].name.localeCompare(b[1].name, "es"))
      .map(([id, entry]) => ({ value: id, label: `${entry.name} (${entry.count})` }));
  }, [rows]);

  const typeOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const row of rows) {
      if (brand && row.brandId !== brand) continue;
      const key = row.productTypeKey === "" ? EMPTY_TYPE : row.productTypeKey;
      const entry = counts.get(key) ?? {
        label: row.productType === "" ? "Sin product_type" : row.productType,
        count: 0,
      };
      entry.count += 1;
      counts.set(key, entry);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label, "es"))
      .map(([value, entry]) => ({ value, label: `${entry.label} (${entry.count})` }));
  }, [rows, brand]);

  const activeType = typeOptions.some((option) => option.value === productType) ? productType : "";

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (brand && row.brandId !== brand) return false;
      if (activeType) {
        const key = row.productTypeKey === "" ? EMPTY_TYPE : row.productTypeKey;
        if (key !== activeType) return false;
      }
      if (needle && !(row.name ?? "").toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, brand, activeType, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const liveIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);
  const selectedIds = [...selected].filter((id) => liveIds.has(id));
  const allVisibleSelected = visible.length > 0 && visible.every((row) => selected.has(row.id));

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));
  const categoryName = (id: string) =>
    categories.find((category) => category.id === id)?.name ?? "";

  function changeFilter(apply: () => void) {
    apply();
    setPage(1);
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisible() {
    setSelected((current) => {
      const next = new Set(current);
      for (const row of visible) {
        if (allVisibleSelected) next.delete(row.id);
        else next.add(row.id);
      }
      return next;
    });
  }

  function selectFiltered() {
    setSelected(new Set(filtered.map((row) => row.id)));
  }

  function forget(ids: string[]) {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  async function assignRow(row: Row, categoryId: string) {
    if (!categoryId) return;
    setSavingRow(row.id);
    try {
      const result = await setProductCategory(row.id, categoryId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      forget([row.id]);
      onAssigned([row.id]);
      showToast(`${row.name ?? "Producto"} → ${categoryName(categoryId)}`, "ok", 1800);
    } finally {
      setSavingRow(null);
    }
  }

  async function assignSelected() {
    if (!bulkCategory || selectedIds.length === 0) return;
    setBulkSaving(true);
    try {
      const result = await setProductsCategory(selectedIds, bulkCategory);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      forget(selectedIds);
      onAssigned(selectedIds);
      showToast(`${result.message} → ${categoryName(bulkCategory)}`, "ok");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Buscar por nombre"
          placeholder="earflap, cammo, tee…"
          value={query}
          onChange={(event) => changeFilter(() => setQuery(event.target.value))}
          wrapperClassName="min-w-56 flex-1"
          autoComplete="off"
        />
        <Select
          label="Marca"
          value={brand}
          onChange={(event) =>
            changeFilter(() => {
              setBrand(event.target.value);
              setProductType("");
            })
          }
          placeholder="Todas"
          options={brandOptions}
          wrapperClassName="w-56"
        />
        <Select
          label="product_type"
          value={activeType}
          onChange={(event) => changeFilter(() => setProductType(event.target.value))}
          placeholder="Todos"
          options={typeOptions}
          wrapperClassName="w-56"
        />
        {query || brand || activeType ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              changeFilter(() => {
                setQuery("");
                setBrand("");
                setProductType("");
              })
            }
          >
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      <div
        className={cn(
          "border-line bg-paper flex flex-wrap items-center gap-3 border px-3 py-2 shadow-xs",
          selectedIds.length > 0 && "border-accent/40 bg-accent-soft",
        )}
      >
        <p className="text-ink/70 text-xs">
          {selectedIds.length > 0 ? (
            <strong className="text-accent">
              {formatNumber(selectedIds.length)} seleccionados
            </strong>
          ) : (
            `${formatNumber(filtered.length)} de ${formatNumber(rows.length)} productos`
          )}
        </p>
        {filtered.length > 0 && selectedIds.length < filtered.length ? (
          <button
            type="button"
            onClick={selectFiltered}
            className="text-accent text-xs font-medium hover:underline"
          >
            Seleccionar los {formatNumber(filtered.length)} filtrados
          </button>
        ) : null}
        {selectedIds.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-ink/60 text-xs hover:underline"
            >
              Quitar selección
            </button>
            <div className="ml-auto flex items-center gap-2">
              <Select
                value={bulkCategory}
                onChange={(event) => setBulkCategory(event.target.value)}
                placeholder="Categoría…"
                options={categoryOptions}
                className="h-8 w-48 text-xs"
                aria-label="Categoría para los seleccionados"
              />
              <Button
                size="sm"
                onClick={assignSelected}
                loading={bulkSaving}
                disabled={!bulkCategory}
              >
                Asignar a {formatNumber(selectedIds.length)}
              </Button>
            </div>
          </>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="border-line bg-paper border p-8 text-center">
          <p className={cn("text-sm", rows.length === 0 ? "text-ok" : "text-ink/60")}>
            {rows.length === 0
              ? "No hay productos sin categoría. Todo el catálogo está clasificado."
              : "Ningún producto coincide con los filtros."}
          </p>
        </div>
      ) : (
        <TableWrapper className="shadow-none">
          <Table>
            <THead>
              <TR>
                <TH className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onChange={toggleVisible}
                    aria-label="Seleccionar los de esta página"
                    className="mt-0"
                  />
                </TH>
                <TH>Img</TH>
                <TH>Nombre</TH>
                <TH>Marca</TH>
                <TH>product_type</TH>
                <TH className="text-right">Precio</TH>
                <TH>Categoría</TH>
              </TR>
            </THead>
            <TBody>
              {visible.map((row) => (
                <TR
                  key={row.id}
                  className={cn(
                    selected.has(row.id) && "bg-accent-soft/60",
                    savingRow === row.id && "opacity-50",
                  )}
                >
                  <TD>
                    <Checkbox
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={`Seleccionar ${row.name ?? "producto"}`}
                      className="mt-0"
                    />
                  </TD>
                  <TD>
                    <button
                      type="button"
                      onClick={() => toggle(row.id)}
                      className="block"
                      tabIndex={-1}
                      aria-hidden
                    >
                      <RemoteImage
                        src={row.image}
                        alt={row.name ?? "Producto"}
                        fallbackLabel="—"
                        className="border-line size-10 border"
                      />
                    </button>
                  </TD>
                  <TD className="max-w-xs">
                    <Link
                      href={`/products/${row.id}`}
                      className="block truncate text-sm font-medium hover:underline"
                      title={row.name ?? undefined}
                    >
                      {row.name ?? "(sin nombre)"}
                    </Link>
                  </TD>
                  <TD className="text-xs whitespace-nowrap">{row.brandName}</TD>
                  <TD className="max-w-40">
                    {row.productType ? (
                      <span className="block truncate font-mono text-xs">{row.productType}</span>
                    ) : (
                      <Badge tone="muted">vacío</Badge>
                    )}
                  </TD>
                  <TD className="text-right text-xs whitespace-nowrap">
                    {formatPrice(row.price, row.currency)}
                  </TD>
                  <TD>
                    <Select
                      value=""
                      onChange={(event) => assignRow(row, event.target.value)}
                      placeholder="Asignar…"
                      options={categoryOptions}
                      disabled={savingRow === row.id}
                      className="h-7 w-44 px-2 text-xs"
                      aria-label={`Categoría de ${row.name ?? "producto"}`}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrapper>
      )}

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-ink/60 text-xs">
            Página {currentPage} de {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
