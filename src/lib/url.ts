/**
 * Helpers de URL compartidos entre cliente y servidor.
 * No importa nada de servidor: se usa tambien en los formularios del navegador.
 */

/** `true` si es una URL http(s) con host. */
export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname !== "";
  } catch {
    return false;
  }
}

/**
 * Normaliza una URL para guardarla: recorta espacios y quita la barra final.
 * Si no es una URL valida, devuelve el texto recortado sin tocar nada mas
 * (quien valide despues dara el error correspondiente).
 */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "";

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (!isHttpUrl(withProtocol)) return trimmed;

  const parsed = new URL(withProtocol);
  parsed.hash = "";
  const pathname = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.protocol}//${parsed.host}${pathname}${parsed.search}`;
}

/**
 * Clave de comparacion de tiendas: sin protocolo, sin `www.`, sin barra final
 * y en minusculas. Sirve para detectar marcas duplicadas.
 */
export function urlKey(value: string): string {
  const normalized = normalizeUrl(value);
  if (normalized === "") return "";

  try {
    const parsed = new URL(normalized);
    const host = parsed.host.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    return `${host}${path}`;
  } catch {
    return normalized.toLowerCase();
  }
}

/** Dominio legible para mostrar en la UI: `shop.marca.com/es`. */
export function displayUrl(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const parsed = new URL(value);
    return `${parsed.host.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return value;
  }
}
