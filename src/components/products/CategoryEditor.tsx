"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createKeywordRule, upsertShopCategoryMapping } from "@/app/classification/actions";
import { setProductCategory, unlockProductCategory } from "@/app/products/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import type { Category, Uuid } from "@/types/db";

export interface CategoryEditorProps {
  productId: Uuid;
  productName: string | null;
  productType: string | null;
  brandId: Uuid;
  brandName: string | null;
  categoryId: Uuid | null;
  categoryLocked: boolean;
  categories: Array<Pick<Category, "id" | "name">>;
}

const NONE = "__none__";

/** Palabras que no sirven como palabra clave de una regla. */
const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "con",
  "sin",
  "del",
  "los",
  "las",
  "una",
  "uno",
  "new",
  "black",
  "white",
  "blue",
  "green",
  "red",
  "grey",
  "gray",
]);

/**
 * Propone una palabra clave a partir del titulo: la palabra mas larga que no
 * sea un color ni una palabra vacia.
 */
function suggestKeyword(name: string | null): string {
  if (!name) return "";
  const words = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));

  return words.sort((a, b) => b.length - a.length)[0] ?? "";
}

export function CategoryEditor({
  productId,
  productName,
  productType,
  brandId,
  brandName,
  categoryId,
  categoryLocked,
  categories,
}: CategoryEditorProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [selected, setSelected] = useState<string>(categoryId ?? NONE);
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // Atajo A: regla por palabra clave
  const [ruleOpen, setRuleOpen] = useState(false);
  const [keyword, setKeyword] = useState(() => suggestKeyword(productName));
  const [ruleCategory, setRuleCategory] = useState<string>(categoryId ?? "");
  const [priority, setPriority] = useState("20");
  const [ruleSaving, setRuleSaving] = useState(false);

  // Atajo B: mapeo del product_type de la marca
  const [mapOpen, setMapOpen] = useState(false);
  const [mapCategory, setMapCategory] = useState<string>(categoryId ?? "");
  const [mapSaving, setMapSaving] = useState(false);

  const dirty = selected !== (categoryId ?? NONE);

  async function save() {
    setSaving(true);
    try {
      const result = await setProductCategory(productId, selected === NONE ? null : selected);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast(result.message, "ok");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function unlock() {
    setUnlocking(true);
    try {
      const result = await unlockProductCategory(productId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast(result.message, "ok");
      router.refresh();
    } finally {
      setUnlocking(false);
    }
  }

  async function saveRule() {
    if (ruleCategory === "") {
      showToast("Elige una categoría para la regla.", "error");
      return;
    }
    setRuleSaving(true);
    try {
      const result = await createKeywordRule(
        { keyword, categoryId: ruleCategory, priority: Number(priority) },
        productId,
      );
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast(result.message, "ok");
      setRuleOpen(false);
      router.refresh();
    } finally {
      setRuleSaving(false);
    }
  }

  async function saveMapping() {
    if (mapCategory === "" || !productType) {
      showToast("Elige una categoría para el mapeo.", "error");
      return;
    }
    setMapSaving(true);
    try {
      const result = await upsertShopCategoryMapping(
        { brandId, externalCategoryName: productType, categoryId: mapCategory },
        productId,
      );
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast(result.message, "ok");
      setMapOpen(false);
      router.refresh();
    } finally {
      setMapSaving(false);
    }
  }

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  return (
    <div className="border-ink bg-paper flex flex-col gap-3 border-2 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          label="Categoría"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          wrapperClassName="w-56"
        >
          <option value={NONE}>Sin categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        <Button onClick={save} loading={saving} disabled={!dirty}>
          Guardar categoría
        </Button>

        {categoryLocked ? (
          <div className="flex items-center gap-2">
            <Badge tone="neutral">🔒 Fijada</Badge>
            <Button variant="secondary" onClick={unlock} loading={unlocking}>
              Dejar que lo decidan las reglas
            </Button>
          </div>
        ) : (
          <Badge tone="muted">Automática</Badge>
        )}
      </div>

      <p className="text-ink/60 text-xs">
        {categoryLocked
          ? "Esta categoría está fijada a mano: el scraper no la tocará."
          : "La categoría la deciden las reglas de clasificación en cada scrape."}
      </p>

      <div className="border-ink flex flex-wrap items-center gap-2 border-t-2 pt-2.5">
        <span className="label-caps text-ink/60">Para que no se repita:</span>
        <Button variant="secondary" size="sm" onClick={() => setRuleOpen(true)}>
          Crear regla con palabra clave
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setMapOpen(true)}
          disabled={!productType}
          title={productType ? undefined : "Este producto no tiene product_type"}
        >
          Mapear product_type de esta marca
        </Button>
      </div>

      {/* Atajo A */}
      <Modal
        open={ruleOpen}
        onClose={() => setRuleOpen(false)}
        title="Crear regla con palabra clave"
        dismissable={!ruleSaving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRuleOpen(false)} disabled={ruleSaving}>
              Cancelar
            </Button>
            <Button onClick={saveRule} loading={ruleSaving}>
              Crear regla
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-ink/70 text-sm">
            Cualquier producto cuyo texto contenga esta palabra se clasificará en la categoría
            elegida. La regla es <strong>global</strong>: afecta a todas las marcas.
          </p>

          <Input
            label="Palabra clave"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            hint="Se guarda en minúsculas. Debe ser única."
            autoComplete="off"
          />

          <Select
            label="Categoría"
            value={ruleCategory}
            onChange={(event) => setRuleCategory(event.target.value)}
            placeholder="Elige una categoría"
            options={categoryOptions}
          />

          <Input
            label="Prioridad"
            type="number"
            min={0}
            max={1000}
            step={1}
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            hint="A mayor número, más manda frente a otras reglas. Por defecto 20."
          />

          <p className="border-ink bg-cream border-2 p-2 text-xs">
            Este cambio <strong>no reclasifica lo que ya hay</strong>: se aplica en el próximo
            scrape de cada marca.
          </p>
        </div>
      </Modal>

      {/* Atajo B */}
      <Modal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        title="Mapear product_type de esta marca"
        dismissable={!mapSaving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMapOpen(false)} disabled={mapSaving}>
              Cancelar
            </Button>
            <Button onClick={saveMapping} loading={mapSaving}>
              Guardar mapeo
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-ink/70 text-sm">
            Todos los productos de <strong>{brandName ?? "esta marca"}</strong> cuyo{" "}
            <code className="bg-cream px-1 font-mono text-xs">product_type</code> sea el de abajo se
            clasificarán en la categoría elegida.
          </p>

          <div className="flex flex-col gap-1.5">
            <span className="label-caps">product_type (en minúsculas)</span>
            <p className="border-ink bg-cream border-2 px-3 py-2 font-mono text-sm">
              {productType ?? "—"}
            </p>
          </div>

          <Select
            label="Categoría"
            value={mapCategory}
            onChange={(event) => setMapCategory(event.target.value)}
            placeholder="Elige una categoría"
            options={categoryOptions}
          />

          <p className="border-ink bg-cream border-2 p-2 text-xs">
            Si ya existía un mapeo para este <code className="font-mono">product_type</code>, se
            actualiza. El cambio <strong>se aplica en el próximo scrape</strong> de la marca.
          </p>
        </div>
      </Modal>
    </div>
  );
}
