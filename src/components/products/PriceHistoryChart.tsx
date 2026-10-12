import { Table, TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { formatDateTime, formatPrice } from "@/lib/utils";
import type { ProductPriceHistory } from "@/types/db";

/** Lienzo del SVG. El ancho real lo da el contenedor (viewBox + preserveAspectRatio). */
const WIDTH = 640;
const HEIGHT = 180;
const PADDING = { top: 16, right: 16, bottom: 28, left: 56 };

/**
 * Mini grafica de linea en SVG, dibujada a mano (sin librerias).
 * Eje X: orden temporal de los registros. Eje Y: precio, con un poco de aire.
 */
export function PriceHistoryChart({
  history,
  currency,
}: {
  history: ProductPriceHistory[];
  currency: string | null;
}) {
  const points = history
    .filter((entry) => typeof entry.price === "number" && entry.scraped_at)
    .map((entry) => ({
      price: entry.price as number,
      at: new Date(entry.scraped_at as string).getTime(),
      iso: entry.scraped_at as string,
      currency: entry.currency ?? currency,
    }))
    .filter((point) => Number.isFinite(point.at))
    .sort((a, b) => a.at - b.at);

  if (points.length === 0) {
    return <p className="text-ink/50 text-sm">No hay historial de precios para este producto.</p>;
  }

  const prices = points.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const flat = maxPrice === minPrice;

  // Con el precio plano se centra la linea; si no, se deja un 10 % de aire.
  const lowerBound = flat ? minPrice - 1 : minPrice - (maxPrice - minPrice) * 0.1;
  const upperBound = flat ? maxPrice + 1 : maxPrice + (maxPrice - minPrice) * 0.1;

  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const x = (index: number) =>
    points.length === 1
      ? PADDING.left + innerWidth / 2
      : PADDING.left + (index / (points.length - 1)) * innerWidth;

  const y = (price: number) =>
    PADDING.top + innerHeight - ((price - lowerBound) / (upperBound - lowerBound)) * innerHeight;

  const line = points.map((point, index) => `${x(index)},${y(point.price)}`).join(" ");
  const last = points[points.length - 1];
  const first = points[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="border-ink bg-paper border-2 p-2">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-44 w-full"
          role="img"
          aria-label={`Evolución del precio: ${points.length} registros entre ${formatPrice(minPrice, currency)} y ${formatPrice(maxPrice, currency)}`}
        >
          {/* Ejes */}
          <line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left}
            y2={PADDING.top + innerHeight}
            stroke="var(--color-ink)"
            strokeWidth={2}
          />
          <line
            x1={PADDING.left}
            y1={PADDING.top + innerHeight}
            x2={PADDING.left + innerWidth}
            y2={PADDING.top + innerHeight}
            stroke="var(--color-ink)"
            strokeWidth={2}
          />

          {/* Referencias de precio maximo y minimo */}
          {[upperBound, lowerBound].map((bound, index) => (
            <g key={index}>
              <line
                x1={PADDING.left}
                y1={y(bound)}
                x2={PADDING.left + innerWidth}
                y2={y(bound)}
                stroke="var(--color-ink)"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.25}
              />
              <text
                x={PADDING.left - 6}
                y={y(bound) + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--color-ink)"
                opacity={0.6}
              >
                {Math.round(bound * 100) / 100}
              </text>
            </g>
          ))}

          {/* Linea */}
          {points.length > 1 ? (
            <polyline
              points={line}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth={2.5}
              strokeLinejoin="miter"
            />
          ) : null}

          {/* Puntos */}
          {points.map((point, index) => (
            <rect
              key={point.iso + index}
              x={x(index) - 3}
              y={y(point.price) - 3}
              width={6}
              height={6}
              fill={index === points.length - 1 ? "var(--color-ok)" : "var(--color-ink)"}
              stroke="var(--color-ink)"
              strokeWidth={1.5}
            />
          ))}

          {/* Fechas de los extremos */}
          <text x={PADDING.left} y={HEIGHT - 8} fontSize={11} fill="var(--color-ink)" opacity={0.6}>
            {first ? new Date(first.iso).toLocaleDateString("es-ES") : ""}
          </text>
          {points.length > 1 && last ? (
            <text
              x={PADDING.left + innerWidth}
              y={HEIGHT - 8}
              fontSize={11}
              textAnchor="end"
              fill="var(--color-ink)"
              opacity={0.6}
            >
              {new Date(last.iso).toLocaleDateString("es-ES")}
            </text>
          ) : null}
        </svg>

        {points.length === 1 ? (
          <p className="text-ink/50 px-1 text-[11px]">
            Solo hay un registro de precio: la gráfica se dibujará cuando el scraper acumule más.
          </p>
        ) : null}
      </div>

      <TableWrapper className="shadow-none">
        <Table>
          <THead>
            <TR>
              <TH>Fecha</TH>
              <TH className="text-right">Precio</TH>
              <TH className="text-right">Variación</TH>
            </TR>
          </THead>
          <TBody>
            {[...points].reverse().map((point, index, array) => {
              // `array` ya está invertido: el siguiente elemento es el anterior en el tiempo.
              const previous = array[index + 1];
              const delta = previous ? point.price - previous.price : null;
              return (
                <TR key={point.iso + index}>
                  <TD className="whitespace-nowrap">{formatDateTime(point.iso)}</TD>
                  <TD className="text-right font-bold">
                    {formatPrice(point.price, point.currency)}
                  </TD>
                  <TD className="text-right">
                    {delta === null || delta === 0 ? (
                      <span className="text-ink/30">—</span>
                    ) : (
                      <span className={delta > 0 ? "text-error" : "text-ok"}>
                        {delta > 0 ? "+" : ""}
                        {Math.round(delta * 100) / 100}
                      </span>
                    )}
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
