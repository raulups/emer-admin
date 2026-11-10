"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { buildQuery } from "@/lib/scrape-filters";
import { formatNumber } from "@/lib/utils";
import { OUTREACH_STATUS_LABELS } from "@/lib/validation/outreach";
import { OUTREACH_STATUSES } from "@/types/db";
import type { OutreachFilters as Filters } from "@/types/outreach";

const SEARCH_DEBOUNCE_MS = 300;

export interface OutreachFiltersProps {
  filters: Filters;
  shown: number;
  total: number;
}

export function OutreachFilters({ filters, shown, total }: OutreachFiltersProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function navigate(changes: Record<string, string | null>) {
    const current = {
      status: filters.status,
      q: filters.q || null,
      due: filters.due ? "1" : null,
    };
    const href = `/outreach${buildQuery(current, changes)}`;
    startTransition(() => router.push(href, { scroll: false }));
  }

  function onSearchChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      navigate({ q: value.trim() === "" ? null : value.trim() });
    }, SEARCH_DEBOUNCE_MS);
  }

  const active = filters.status !== null || filters.q !== "" || filters.due;

  return (
    <div className="border-ink bg-paper shadow-hard flex flex-wrap items-end justify-between gap-3 border-2 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Buscar"
          placeholder="Marca, @instagram, correo…"
          value={query}
          onChange={(event) => onSearchChange(event.target.value)}
          wrapperClassName="min-w-56"
          autoComplete="off"
        />
        <Select
          label="Estado"
          value={filters.status ?? ""}
          onChange={(event) => navigate({ status: event.target.value || null })}
          placeholder="Todos"
          options={OUTREACH_STATUSES.map((status) => ({
            value: status,
            label: OUTREACH_STATUS_LABELS[status],
          }))}
          wrapperClassName="w-48"
        />
        <Checkbox
          name="due"
          label="Solo seguimientos vencidos"
          checked={filters.due}
          onChange={(event) => navigate({ due: event.target.checked ? "1" : null })}
          wrapperClassName="pb-2.5"
        />
        {active ? (
          <Button
            variant="secondary"
            size="sm"
            className="mb-1"
            onClick={() => {
              setQuery("");
              navigate({ status: null, q: null, due: null });
            }}
          >
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      <p className="text-ink/60 flex items-center gap-2 text-xs">
        {pending ? <Spinner size="sm" /> : null}
        {shown === total
          ? `${formatNumber(total)} ${total === 1 ? "marca" : "marcas"}`
          : `${formatNumber(shown)} de ${formatNumber(total)} marcas`}
      </p>
    </div>
  );
}
