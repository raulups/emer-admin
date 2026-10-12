/**
 * Une clases condicionales sin dependencias externas.
 * Acepta cualquier valor: se queda solo con los strings no vacios, asi que
 * `cn("base", cond && "extra")` funciona aunque `cond` no sea booleano.
 */
export function cn(...classes: unknown[]): string {
  return classes
    .filter((value): value is string => typeof value === "string" && value !== "")
    .join(" ");
}

/** Formatea una fecha ISO como `11/10/2026 13:45`. Devuelve `—` si no hay fecha. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Formatea una fecha ISO como `11/10/2026`. Devuelve `—` si no hay fecha. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Fecha relativa en español: `hace 5 min`, `hace 3 d`, `en 2 h`.
 * Se calcula en el servidor, asi que puede quedar algo desfasada si la pestaña
 * se queda abierta mucho tiempo; para el panel es suficiente.
 */
export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffSeconds = (date.getTime() - Date.now()) / 1000;
  const formatter = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto", style: "short" });

  const units: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
    { unit: "year", seconds: 60 * 60 * 24 * 365 },
    { unit: "month", seconds: 60 * 60 * 24 * 30 },
    { unit: "day", seconds: 60 * 60 * 24 },
    { unit: "hour", seconds: 60 * 60 },
    { unit: "minute", seconds: 60 },
  ];

  for (const { unit, seconds } of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return "ahora mismo";
}

/** Duracion entre dos fechas ISO, en formato `2 min 14 s`. */
export function formatDuration(
  from: string | null | undefined,
  to: string | null | undefined,
): string {
  if (!from || !to) return "—";
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "—";

  const totalSeconds = Math.round((end - start) / 1000);
  if (totalSeconds < 60) return `${totalSeconds} s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;

  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

/** Porcentaje entero de `value` sobre `total`. `0` si el total es 0. */
export function percentOf(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

/** Formatea un numero con separadores de miles en español. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-ES").format(value);
}

/** Formatea un precio. `currency` es un codigo ISO de 3 letras (EUR por defecto). */
export function formatPrice(
  value: number | null | undefined,
  currency: string | null | undefined = "EUR",
): string {
  if (value === null || value === undefined) return "—";
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: (currency ?? "EUR").toUpperCase(),
    }).format(value);
  } catch {
    return `${value} ${currency ?? ""}`.trim();
  }
}
