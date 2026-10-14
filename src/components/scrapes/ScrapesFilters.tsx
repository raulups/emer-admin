"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { buildQuery } from "@/lib/scrape-filters";
import { formatNumber } from "@/lib/utils";
import type { Brand } from "@/types/db";
import {
  SCRAPE_RUN_STATE_LABELS,
  SCRAPE_RUN_STATES,
  type ScrapeRunsFilters,
} from "@/types/scrapes";

export interface ScrapesFiltersProps {
  filters: ScrapeRunsFilters;
  brands: Array<Pick<Brand, "id" | "name">>;
  total: number;
  limit: number;
}

export function ScrapesFilters({ filters, brands, total, limit }: ScrapesFiltersProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function navigate(changes: Partial<Record<keyof ScrapeRunsFilters, string | null>>) {
    const href = `/scraper${buildQuery({ brand: filters.brand, status: filters.status }, changes)}`;
    startTransition(() => router.push(href, { scroll: false }));
  }

  const active = filters.brand !== null || filters.status !== null;

  return (
    <div className="border-ink bg-paper shadow-hard flex flex-wrap items-end justify-between gap-3 border-2 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Estado"
          value={filters.status ?? ""}
          onChange={(event) => navigate({ status: event.target.value || null })}
          placeholder="Todos"
          options={SCRAPE_RUN_STATES.map((status) => ({
            value: status,
            label: SCRAPE_RUN_STATE_LABELS[status],
          }))}
          wrapperClassName="w-52"
        />
        <Select
          label="Marca"
          value={filters.brand ?? ""}
          onChange={(event) => navigate({ brand: event.target.value || null })}
          placeholder="Todas"
          options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
          wrapperClassName="w-56"
        />
        {active ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate({ brand: null, status: null })}
          >
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      <p className="text-ink/60 flex items-center gap-2 text-xs">
        {pending ? <Spinner size="sm" /> : null}
        {formatNumber(total)} {total === 1 ? "ejecución" : "ejecuciones"}
        {total >= limit ? ` (las ${formatNumber(limit)} más recientes)` : ""}
      </p>
    </div>
  );
}
