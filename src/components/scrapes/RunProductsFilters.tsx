"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { buildQuery } from "@/lib/scrape-filters";
import { formatNumber } from "@/lib/utils";
import type { Uuid } from "@/types/db";
import {
  RUN_PRODUCT_ACTION_LABELS,
  RUN_PRODUCT_ACTIONS,
  type RunProductsFilters as Filters,
} from "@/types/scrapes";

const SEARCH_DEBOUNCE_MS = 350;

export interface RunProductsFiltersProps {
  runId: Uuid;
  filters: Filters;
  total: number;
}

export function RunProductsFilters({ runId, filters, total }: RunProductsFiltersProps) {
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
    const current = { action: filters.action, q: filters.q || null, page: filters.page };
    const href = `/scraper/${runId}${buildQuery(current, { ...changes, page: null })}`;
    startTransition(() => router.push(href, { scroll: false }));
  }

  function onSearchChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      navigate({ q: value.trim() === "" ? null : value.trim() });
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="border-ink bg-paper flex flex-wrap items-end justify-between gap-3 border-b-2 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Buscar por nombre"
          placeholder="Camiseta, hoodie…"
          value={query}
          onChange={(event) => onSearchChange(event.target.value)}
          wrapperClassName="min-w-56"
          autoComplete="off"
        />
        <Select
          label="Acción"
          value={filters.action ?? ""}
          onChange={(event) => navigate({ action: event.target.value || null })}
          placeholder="Todas"
          options={RUN_PRODUCT_ACTIONS.map((action) => ({
            value: action,
            label: RUN_PRODUCT_ACTION_LABELS[action],
          }))}
          wrapperClassName="w-40"
        />
      </div>
      <p className="text-ink/60 flex items-center gap-2 text-xs">
        {pending ? <Spinner size="sm" /> : null}
        {formatNumber(total)} {total === 1 ? "producto" : "productos"}
      </p>
    </div>
  );
}
