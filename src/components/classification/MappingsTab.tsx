"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  deleteShopCategoryMapping,
  updateShopCategoryMapping,
  upsertShopCategoryMapping,
} from "@/app/classification/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatNumber } from "@/lib/utils";
import type { MappingRow } from "@/types/classification";
import type { Brand, Category } from "@/types/db";

export interface MappingsTabProps {
  mappings: MappingRow[];
  brands: Array<Pick<Brand, "id" | "name">>;
  categories: Array<Pick<Category, "id" | "name">>;
}

export function MappingsTab({ mappings, brands, categories }: MappingsTabProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [brandFilter, setBrandFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<MappingRow | null>(null);

  // Alta de mapeo.
  const [newBrand, setNewBrand] = useState("");
  const [newType, setNewType] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [creating, setCreating] = useState(false);

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));
  const brandOptions = brands.map((brand) => ({ value: brand.id, label: brand.name }));

  const visible = useMemo(
    () => (brandFilter === "" ? mappings : mappings.filter((m) => m.brandId === brandFilter)),
    [mappings, brandFilter],
  );

  async function changeCategory(mapping: MappingRow, categoryId: string) {
    setBusyId(mapping.id);
    try {
      const result = await updateShopCategoryMapping(mapping.id, categoryId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast(result.message, "ok");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function create() {
    if (newBrand === "" || newCategory === "") {
      showToast("Elige marca y categoría.", "error");
      return;
    }

    setCreating(true);
    try {
      const result = await upsertShopCategoryMapping({
        brandId: newBrand,
        externalCategoryName: newType,
        categoryId: newCategory,
      });

      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }

      showToast(result.message, "ok");
      setNewType("");
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const result = await deleteShopCategoryMapping(toDelete.id);

    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }

    showToast(result.message, "ok");
    setToDelete(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="border-ink bg-cream border-2 p-3 text-xs">
        Un mapeo fuerza la categoría de todos los productos de <strong>una marca</strong> cuyo{" "}
        <code className="font-mono">product_type</code> coincida. Es lo primero que mira el scraper,
        por delante de cualquier regla. Se aplica en el próximo scrape.
      </p>

      {/* Alta */}
      <div className="border-ink bg-paper flex flex-wrap items-end gap-3 border-2 p-3">
        <Select
          label="Marca"
          value={newBrand}
          onChange={(event) => setNewBrand(event.target.value)}
          placeholder="Elige…"
          options={brandOptions}
          wrapperClassName="w-52"
        />
        <Input
          label="product_type de la tienda"
          placeholder="man jacket"
          value={newType}
          onChange={(event) => setNewType(event.target.value)}
          hint="Se guarda en minúsculas."
          wrapperClassName="min-w-48 flex-1"
          autoComplete="off"
        />
        <Select
          label="Categoría de Emer"
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
          placeholder="Elige…"
          options={categoryOptions}
          wrapperClassName="w-52"
        />
        <Button onClick={create} loading={creating}>
          Añadir mapeo
        </Button>
      </div>

      {/* Filtro */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Select
          label="Filtrar por marca"
          value={brandFilter}
          onChange={(event) => setBrandFilter(event.target.value)}
          placeholder="Todas"
          options={brandOptions}
          wrapperClassName="w-56"
        />
        <p className="text-ink/60 pb-2 text-xs">
          {formatNumber(visible.length)} {visible.length === 1 ? "mapeo" : "mapeos"}
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="border-ink bg-paper border-2 p-8 text-center">
          <p className="text-ink/60 text-sm">
            {mappings.length === 0
              ? "Todavía no hay mapeos. Créalos desde aquí o desde la pestaña Sin categoría."
              : "Ningún mapeo para esa marca."}
          </p>
        </div>
      ) : (
        <TableWrapper className="shadow-none">
          <Table>
            <THead>
              <TR>
                <TH>Marca</TH>
                <TH>product_type</TH>
                <TH>Categoría</TH>
                <TH className="text-right">Productos ahora</TH>
                <TH className="text-right">Borrar</TH>
              </TR>
            </THead>
            <TBody>
              {visible.map((mapping) => (
                <TR key={mapping.id} className={busyId === mapping.id ? "opacity-50" : undefined}>
                  <TD className="whitespace-nowrap">
                    <Link href={`/brands/${mapping.brandId}`} className="font-bold hover:underline">
                      {mapping.brandName ?? "(marca desconocida)"}
                    </Link>
                  </TD>

                  <TD className="font-mono text-xs">{mapping.externalCategoryName}</TD>

                  <TD>
                    <Select
                      value={mapping.categoryId ?? ""}
                      onChange={(event) => changeCategory(mapping, event.target.value)}
                      placeholder="Sin categoría"
                      options={categoryOptions}
                      disabled={busyId === mapping.id}
                      className="w-48 py-1 text-xs"
                      aria-label={`Categoría de ${mapping.externalCategoryName}`}
                    />
                  </TD>

                  <TD className="text-right">
                    {mapping.productsCount === 0 ? (
                      <Badge tone="muted">0</Badge>
                    ) : (
                      <Link
                        href={`/products?brand=${mapping.brandId}`}
                        className="font-bold hover:underline"
                      >
                        {formatNumber(mapping.productsCount)}
                      </Link>
                    )}
                  </TD>

                  <TD className="text-right">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setToDelete(mapping)}
                      disabled={busyId === mapping.id}
                    >
                      Borrar
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrapper>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Borrar mapeo"
        confirmLabel="Borrar"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        description={
          <p>
            Se borrará el mapeo de{" "}
            <strong className="font-mono">{toDelete?.externalCategoryName}</strong> en{" "}
            <strong>{toDelete?.brandName}</strong>. Los productos ya clasificados no cambian; en el
            próximo scrape volverán a decidirlo las reglas.
          </p>
        }
      />
    </div>
  );
}
