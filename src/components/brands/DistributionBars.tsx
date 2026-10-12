import { formatNumber, percentOf } from "@/lib/utils";
import type { DistributionItem } from "@/types/brands";

export interface DistributionBarsProps {
  items: DistributionItem[];
  /** Base del porcentaje. Si no se pasa, se usa la suma de los items. */
  total?: number;
  emptyLabel?: string;
}

/**
 * Barras horizontales hechas solo con CSS (ancho en %), sin librerias de
 * graficos. La barra mas larga es la de mayor recuento.
 */
export function DistributionBars({
  items,
  total,
  emptyLabel = "Sin datos todavía",
}: DistributionBarsProps) {
  if (items.length === 0) {
    return <p className="text-ink/50 text-sm">{emptyLabel}</p>;
  }

  const base = total ?? items.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => {
        const percent = percentOf(item.count, base);
        return (
          <li key={item.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-xs font-bold tracking-wide uppercase">
                {item.label}
              </span>
              <span className="text-ink/60 shrink-0 text-xs">
                <span className="text-ink font-bold">{formatNumber(item.count)}</span> · {percent}%
              </span>
            </div>
            <div className="border-ink bg-cream h-4 w-full border-2">
              <div
                className="bg-ink h-full"
                style={{ width: `${Math.max((item.count / max) * 100, 2)}%` }}
                role="presentation"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
