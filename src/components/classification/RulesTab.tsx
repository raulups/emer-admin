"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  createKeywordRule,
  deleteKeywordRule,
  updateKeywordRule,
} from "@/app/classification/actions";
import { RuleTester } from "@/components/classification/RuleTester";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import type { ClassifyRule } from "@/lib/classify";
import { formatNumber } from "@/lib/utils";
import type { RuleRow } from "@/types/classification";
import type { Category } from "@/types/db";

export interface RulesTabProps {
  rules: RuleRow[];
  categories: Array<Pick<Category, "id" | "name">>;
}

export function RulesTab({ rules, categories }: RulesTabProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<RuleRow | null>(null);

  // Alta de regla.
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPriority, setNewPriority] = useState("20");
  const [creating, setCreating] = useState(false);

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rules.filter((rule) => {
      if (needle !== "" && !rule.keyword.includes(needle)) return false;
      if (categoryFilter !== "" && rule.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [rules, query, categoryFilter]);

  /** Reglas válidas para el probador (las que tienen categoría). */
  const classifyRules: ClassifyRule[] = useMemo(
    () =>
      rules
        .filter((rule): rule is RuleRow & { categoryId: string } => rule.categoryId !== null)
        .map((rule) => ({
          keyword: rule.keyword,
          categoryId: rule.categoryId,
          priority: rule.priority,
        })),
    [rules],
  );

  async function patch(rule: RuleRow, changes: Parameters<typeof updateKeywordRule>[1]) {
    setBusyId(rule.id);
    try {
      const result = await updateKeywordRule(rule.id, changes);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function create() {
    if (newCategory === "") {
      showToast("Elige una categoría para la regla.", "error");
      return;
    }

    setCreating(true);
    try {
      const result = await createKeywordRule({
        keyword: newKeyword,
        categoryId: newCategory,
        priority: Number(newPriority),
      });

      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }

      showToast(result.message, "ok");
      setNewKeyword("");
      setNewPriority("20");
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const result = await deleteKeywordRule(toDelete.id);

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
        <strong>Prioridad mayor gana.</strong> Las palabras se buscan como palabra completa (admiten
        plural s/es) primero en el título y luego en el product_type. Los cambios se aplican en el
        próximo scrape.
      </p>

      <RuleTester rules={classifyRules} categories={categories} />

      {/* Alta */}
      <div className="border-ink bg-paper flex flex-wrap items-end gap-3 border-2 p-3">
        <Input
          label="Nueva palabra clave"
          placeholder="hoodie"
          value={newKeyword}
          onChange={(event) => setNewKeyword(event.target.value)}
          hint="En minúsculas y sin espacios sobrantes."
          wrapperClassName="min-w-48 flex-1"
          autoComplete="off"
        />
        <Select
          label="Categoría"
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
          placeholder="Elige…"
          options={categoryOptions}
          wrapperClassName="w-52"
        />
        <Input
          label="Prioridad"
          type="number"
          min={0}
          max={1000}
          step={1}
          value={newPriority}
          onChange={(event) => setNewPriority(event.target.value)}
          wrapperClassName="w-28"
        />
        <Button onClick={create} loading={creating}>
          Añadir regla
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Buscar palabra clave"
            placeholder="shirt…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            wrapperClassName="w-56"
            autoComplete="off"
          />
          <Select
            label="Categoría"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            placeholder="Todas"
            options={categoryOptions}
            wrapperClassName="w-52"
          />
        </div>
        <p className="text-ink/60 pb-2 text-xs">
          {formatNumber(visible.length)} de {formatNumber(rules.length)} reglas
        </p>
      </div>

      {/* Tabla editable */}
      <TableWrapper className="shadow-none">
        <Table>
          <THead>
            <TR>
              <TH>Palabra clave</TH>
              <TH>Categoría</TH>
              <TH className="text-right">Prioridad</TH>
              <TH className="text-right">Borrar</TH>
            </TR>
          </THead>
          <TBody>
            {visible.map((rule) => (
              <TR key={rule.id} className={busyId === rule.id ? "opacity-50" : undefined}>
                <TD className="font-mono font-bold">{rule.keyword}</TD>

                <TD>
                  <Select
                    value={rule.categoryId ?? ""}
                    onChange={(event) => patch(rule, { categoryId: event.target.value })}
                    placeholder="Sin categoría"
                    options={categoryOptions}
                    disabled={busyId === rule.id}
                    className="w-48 py-1 text-xs"
                    aria-label={`Categoría de ${rule.keyword}`}
                  />
                </TD>

                <TD className="text-right">
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    step={1}
                    defaultValue={rule.priority}
                    disabled={busyId === rule.id}
                    aria-label={`Prioridad de ${rule.keyword}`}
                    onBlur={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value) && value !== rule.priority) {
                        void patch(rule, { priority: value });
                      }
                    }}
                    className="border-ink bg-paper w-20 border-2 px-2 py-1 text-right text-xs"
                  />
                </TD>

                <TD className="text-right">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setToDelete(rule)}
                    disabled={busyId === rule.id}
                  >
                    Borrar
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrapper>

      {visible.length === 0 ? (
        <p className="border-ink bg-paper text-ink/60 border-2 p-6 text-center text-sm">
          Ninguna regla coincide con el filtro.
        </p>
      ) : null}

      <ConfirmDialog
        open={toDelete !== null}
        title="Borrar regla"
        confirmLabel="Borrar"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        description={
          <p>
            Se borrará la regla <strong className="font-mono">{toDelete?.keyword}</strong> (
            {toDelete?.categoryName ?? "sin categoría"}). Los productos ya clasificados no cambian;
            solo deja de aplicarse en los próximos scrapes.
          </p>
        }
      />
    </div>
  );
}
