"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { deleteWaitlistEntry, setWaitlistNotified } from "@/app/waitlist/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatNumber } from "@/lib/utils";
import type { AppWaitlistEntry } from "@/types/db";

type StatusFilter = "" | "pending" | "notified";

const SOURCE_LABELS: Record<string, string> = {
  "web-mobile": "Web móvil",
  web: "Web",
  app: "App",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Por avisar" },
  { value: "notified", label: "Avisados" },
];

/** CSV con separador `;` (Excel en espanol) y BOM para que abra bien las tildes. */
function toCsv(entries: AppWaitlistEntry[]): string {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = entries.map((entry) =>
    [entry.email, entry.source, entry.created_at, entry.notified_at ?? ""].map(quote).join(";"),
  );
  return `﻿${["email;origen;apuntado;avisado", ...rows].join("\n")}`;
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export interface WaitlistTableProps {
  entries: AppWaitlistEntry[];
}

export function WaitlistTable({ entries }: WaitlistTableProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<AppWaitlistEntry | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (entry) =>
        (q === "" || entry.email.includes(q)) &&
        (status === "" ||
          (status === "pending" ? entry.notified_at === null : entry.notified_at !== null)),
    );
  }, [entries, query, status]);

  const selectedVisible = visible.filter((entry) => selected.has(entry.id));
  const allSelected = visible.length > 0 && selectedVisible.length === visible.length;
  /** Las acciones van sobre la seleccion o, sin seleccion, sobre lo que se ve. */
  const target = selectedVisible.length > 0 ? selectedVisible : visible;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(visible.map((entry) => entry.id)));
  }

  async function copyEmails() {
    const text = target.map((entry) => entry.email).join(", ");
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${formatNumber(target.length)} emails copiados.`, "ok");
    } catch {
      showToast("No se han podido copiar. Usa Descargar CSV.", "error");
    }
  }

  async function markNotified(notified: boolean) {
    setBusy(true);
    try {
      const result = await setWaitlistNotified(
        target.map((entry) => entry.id),
        notified,
      );
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast(result.message, "ok");
      setSelected(new Set());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const result = await deleteWaitlistEntry(toDelete.id);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(result.message, "ok");
    setToDelete(null);
    router.refresh();
  }

  const scope =
    selectedVisible.length > 0
      ? `${formatNumber(selectedVisible.length)} seleccionados`
      : `${formatNumber(visible.length)} visibles`;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-line bg-paper flex flex-wrap items-end gap-3 rounded-xl border p-3 shadow-xs">
        <Input
          label="Buscar email"
          placeholder="ana@…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          wrapperClassName="min-w-48 flex-1"
          autoComplete="off"
        />
        <Select
          label="Estado"
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
          placeholder="Todos"
          options={STATUS_OPTIONS}
          wrapperClassName="w-44"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink/60 text-xs">Acciones sobre: {scope}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={copyEmails} disabled={target.length === 0}>
            Copiar emails
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => download("emer-lista-de-espera.csv", toCsv(target))}
            disabled={target.length === 0}
          >
            Descargar CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => markNotified(false)}
            disabled={busy || !target.some((entry) => entry.notified_at !== null)}
          >
            Volver a pendiente
          </Button>
          <Button
            size="sm"
            onClick={() => markNotified(true)}
            loading={busy}
            disabled={!target.some((entry) => entry.notified_at === null)}
          >
            Marcar como avisados
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="border-line bg-paper rounded-xl border p-8 text-center">
          <p className="text-ink/60 text-sm">Ningún email coincide con el filtro.</p>
        </div>
      ) : (
        <TableWrapper className="shadow-none">
          <Table>
            <THead>
              <TR>
                <TH className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos los visibles"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-accent size-4"
                  />
                </TH>
                <TH>Email</TH>
                <TH>Origen</TH>
                <TH>Apuntado</TH>
                <TH>Estado</TH>
                <TH className="text-right">Borrar</TH>
              </TR>
            </THead>
            <TBody>
              {visible.map((entry) => (
                <TR
                  key={entry.id}
                  className={selected.has(entry.id) ? "bg-accent-soft" : undefined}
                >
                  <TD>
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${entry.email}`}
                      checked={selected.has(entry.id)}
                      onChange={() => toggle(entry.id)}
                      className="accent-accent size-4"
                    />
                  </TD>
                  <TD className="font-mono text-xs">
                    <a href={`mailto:${entry.email}`} className="hover:underline">
                      {entry.email}
                    </a>
                  </TD>
                  <TD className="whitespace-nowrap">
                    {SOURCE_LABELS[entry.source] ?? entry.source}
                  </TD>
                  <TD className="whitespace-nowrap">{formatDateTime(entry.created_at)}</TD>
                  <TD className="whitespace-nowrap">
                    {entry.notified_at ? (
                      <Badge tone="ok">Avisado · {formatDateTime(entry.notified_at)}</Badge>
                    ) : (
                      <Badge tone="progress">Por avisar</Badge>
                    )}
                  </TD>
                  <TD className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Borrar ${entry.email}`}
                      onClick={() => setToDelete(entry)}
                    >
                      ✕
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
        title="Borrar email de la lista"
        description={
          toDelete ? (
            <>
              Se borra <strong>{toDelete.email}</strong> y ya no se le avisará del lanzamiento.
            </>
          ) : null
        }
        confirmLabel="Borrar"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
