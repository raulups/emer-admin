"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Preferencia de UI persistida en localStorage.
 *
 * Usa `useSyncExternalStore` en vez de `useState` + `useEffect`: durante el
 * render del servidor devuelve `fallback` (sin desajuste de hidratacion) y
 * despues lee el valor real, sin llamar a setState dentro de un efecto.
 */

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Guarda un valor de un conjunto cerrado de opciones (p. ej. el modo de vista).
 * Si lo guardado no esta en `allowed`, se ignora y se usa `fallback`.
 */
export function useStoredOption<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const raw = window.localStorage.getItem(key);
        return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );

  const setValue = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Modo privado o almacenamiento lleno: la preferencia no se guarda.
      }
      notify();
    },
    [key],
  );

  return [value, setValue];
}
