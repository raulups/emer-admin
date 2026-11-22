"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

export function isPageVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

/**
 * `true` mientras la pestana esta a la vista. Los bucles de polling se
 * pausan en segundo plano para no cargar Supabase.
 */
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribe, isPageVisible, () => true);
}
