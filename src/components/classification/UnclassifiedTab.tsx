"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createKeywordRule, upsertShopCategoryMapping } from "@/app/classification/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatNumber } from "@/lib/utils";
import type { UnclassifiedGroup } from "@/types/classification";
import type { Category } from "@/types/db";

export interface UnclassifiedTabProps {
  groups: UnclassifiedGroup[];
  total: number;
  truncated: boolean;
  categories: Array<Pick<Category, "id" | "name">>;
}

/** Palabra mas larga del titulo que sirva como keyword de partida. */
function suggestKeyword(group: UnclassifiedGroup): string {
  const source = group.productType || group.samples[0]?.name || "";
  const words = source
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4);

  return words.sort((a, b) => b.length - a.length)[0] ?? "";
}

export function UnclassifiedTab({ groups, total, truncated, categories }: UnclassifiedTabProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  // Categoría elegida en cada fila para el mapeo rápido.
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Modal de "crear regla".
  const [ruleFor, setRuleFor] = useState<UnclassifiedGroup | null>(null);
  const [keyword, setKeyword] = useState("");
  const [ruleCategory, setRuleCategory] = useState("");
  const [priority, setPriority] = useState("20");
  const [savingRule, setSavingRule] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return groups;
    return groups.filter(
      (group) =>
        group.brandName.toLowerCase().includes(needle) || group.productTypeKey.includes(needle),
    );
  }, [groups, query]);

  const keyOf = (group: UnclassifiedGroup) => `${group.brandId}|${group.productTypeKey}`;

  async function mapGroup(group: UnclassifiedGroup) {
    const key = keyOf(group);
    const categoryId = picked[key];

    if (!categoryId) {
      showToast("Elige antes una categoría para el mapeo.", "error");
      return;
    }

    setBusyKey(key);
    try {
      const result = await upsertShopCategoryMapping({
        brandId: group.brandId,
        externalCategoryName: group.productTypeKey,
        categoryId,
      });

      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }

      showToast(result.message, "ok");
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  function openRuleModal(group: UnclassifiedGroup) {
    setRuleFor(group);
    setKeyword(suggestKeyword(group));
    setRuleCategory(picked[keyOf(group)] ?? "");
    setPriority("20");
  }

  async function saveRule() {
    if (!ruleFor) return;
    if (ruleCategory === "") {
      showToast("Elige una categoría para la regla.", "error");
      return;
    }

    setSavingRule(true);
    try {
      const result = await createKeywordRule({
        keyword,
        categoryId: ruleCategory,
        priority: Number(priority),
      });

      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }

      showToast(result.message, "ok");
      setRuleFor(null);
      router.refresh();
    } finally {
      setSavingRule(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Input
          label="Buscar marca o product_type"
          placeholder="scuffers, hoodie…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          wrapperClassName="min-w-64 flex-1"
          autoComplete="off"
        />
        <p className="text-ink/60 text-xs">
          {formatNumber(total)} productos sin categoría en {formatNumber(groups.length)} grupos
          {visible.length !== groups.length ? ` · ${formatNumber(visible.length)} visibles` : ""}
        </p>
      </div>

      {truncated ? (
        <p className="border-error bg-paper text-error border-2 p-3 text-xs">
          Hay más productos sin categoría de los que se leen de una vez: la lista está recortada.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="border-ink bg-paper border-2 p-8 text-center">
          <p className="text-ok text-sm">
            {groups.length === 0
              ? "No hay productos sin categoría. Todo el catálogo está clasificado."
              : "Ningún grupo coincide con la búsqueda."}
          </p>
        </div>
      ) : (
        <TableWrapper className="shadow-none">
          <Table>
            <THead>
              <TR>
                <TH>Marca</TH>
                <TH>product_type</TH>
                <TH className="text-right">Productos</TH>
                <TH>Ejemplos</TH>
                <TH>Acciones rápidas</TH>
              </TR>
            </THead>
            <TBody>
              {visible.map((group) => {
                const key = keyOf(group);
                return (
                  <TR key={key}>
                    <TD className="whitespace-nowrap">
                      <Link href={`/brands/${group.brandId}`} className="font-bold hover:underline">
                        {group.brandName}
                      </Link>
                    </TD>

                    <TD>
                      {group.productType ? (
                        <span className="font-mono text-xs">{group.productType}</span>
                      ) : (
                        <Badge tone="muted">sin product_type</Badge>
                      )}
                    </TD>

                    <TD className="text-right font-bold">{formatNumber(group.count)}</TD>

                    <TD>
                      <ul className="flex flex-col gap-0.5">
                        {group.samples.map((sample) => (
                          <li key={sample.id}>
                            <Link
                              href={`/products/${sample.id}`}
                              className="decoration-ink/30 hover:decoration-ink text-xs underline"
                            >
                              {sample.name ?? "(sin nombre)"}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </TD>

                    <TD>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={picked[key] ?? ""}
                          onChange={(event) =>
                            setPicked((current) => ({ ...current, [key]: event.target.value }))
                          }
                          placeholder="Categoría…"
                          options={categories.map((category) => ({
                            value: category.id,
                            label: category.name,
                          }))}
                          className="w-44 py-1 text-xs"
                          aria-label={`Categoría para ${group.brandName} / ${group.productType}`}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => mapGroup(group)}
                          loading={busyKey === key}
                          disabled={!group.productType}
                          title={
                            group.productType
                              ? "Crea el mapeo product_type → categoría para esta marca"
                              : "Sin product_type no se puede mapear"
                          }
                        >
                          Mapear este product_type
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => openRuleModal(group)}>
                          Crear regla
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableWrapper>
      )}

      {/* Modal de regla */}
      <Modal
        open={ruleFor !== null}
        onClose={() => setRuleFor(null)}
        title="Crear regla con palabra clave"
        dismissable={!savingRule}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRuleFor(null)} disabled={savingRule}>
              Cancelar
            </Button>
            <Button onClick={saveRule} loading={savingRule}>
              Crear regla
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-ink/70 text-sm">
            Regla <strong>global</strong>: cualquier producto cuyo título o product_type contenga
            esta palabra irá a la categoría elegida.
          </p>

          <Input
            label="Palabra clave"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            hint="Se guarda en minúsculas y debe ser única."
            autoComplete="off"
          />

          <Select
            label="Categoría"
            value={ruleCategory}
            onChange={(event) => setRuleCategory(event.target.value)}
            placeholder="Elige una categoría"
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
          />

          <Input
            label="Prioridad"
            type="number"
            min={0}
            max={1000}
            step={1}
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            hint="A mayor número, más manda. Por defecto 20."
          />

          <p className="border-ink bg-cream border-2 p-2 text-xs">
            No reclasifica lo que ya hay: se aplica en el <strong>próximo scrape</strong>.
          </p>
        </div>
      </Modal>
    </div>
  );
}
