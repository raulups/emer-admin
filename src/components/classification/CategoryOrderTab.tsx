"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { reorderCategories } from "@/app/classification/actions";
import { Button } from "@/components/ui/Button";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import type { Category } from "@/types/db";

type Row = Pick<Category, "id" | "name" | "position">;

export interface CategoryOrderTabProps {
  categories: Row[];
}

/** Mueve el elemento de `from` a `to` sin mutar la lista. */
function move<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

export function CategoryOrderTab({ categories }: CategoryOrderTabProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [rows, setRows] = useState<Row[]>(categories);
  const [saving, setSaving] = useState(false);

  const dirty = rows.some((row, index) => row.id !== categories[index]?.id);
  const unpositioned = categories.filter((row) => row.position === null).length;

  async function save() {
    setSaving(true);
    try {
      const result = await reorderCategories(rows.map((row) => row.id));
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

  return (
    <div className="flex flex-col gap-4">
      <p className="border-ink bg-cream border-2 p-3 text-xs">
        Orden de las categorías en el <strong>Marketplace</strong> de la web y la app, en sus menús
        y en el orden recomendado: se enseña la primera categoría entera antes de pasar a la
        siguiente. Se guarda como <code className="font-mono">categories.position</code> (10, 20,
        30…).
      </p>

      {unpositioned > 0 ? (
        <p className="border-ink bg-progress border-2 p-3 text-xs">
          {unpositioned === 1 ? "Hay 1 categoría" : `Hay ${unpositioned} categorías`} sin posición:
          van al final, por nombre. Guarda el orden para fijarlas.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" onClick={() => setRows(categories)} disabled={!dirty || saving}>
          Deshacer
        </Button>
        <Button onClick={save} loading={saving} disabled={!dirty && unpositioned === 0}>
          Guardar orden
        </Button>
      </div>

      <TableWrapper className="shadow-none">
        <Table>
          <THead>
            <TR>
              <TH className="w-16 text-right">#</TH>
              <TH>Categoría</TH>
              <TH className="text-right">Mover</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((row, index) => {
              const moved = row.id !== categories[index]?.id;
              return (
                <TR key={row.id} className={moved ? "bg-cream" : undefined}>
                  <TD className="text-right font-mono text-xs">{index + 1}</TD>
                  <TD className="font-bold">{row.name}</TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Subir ${row.name} al principio`}
                        disabled={index === 0 || saving}
                        onClick={() => setRows((list) => move(list, index, 0))}
                      >
                        ⤒
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Subir ${row.name}`}
                        disabled={index === 0 || saving}
                        onClick={() => setRows((list) => move(list, index, index - 1))}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Bajar ${row.name}`}
                        disabled={index === rows.length - 1 || saving}
                        onClick={() => setRows((list) => move(list, index, index + 1))}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Bajar ${row.name} al final`}
                        disabled={index === rows.length - 1 || saving}
                        onClick={() => setRows((list) => move(list, index, list.length - 1))}
                      >
                        ⤓
                      </Button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </TableWrapper>
    </div>
  );
}
