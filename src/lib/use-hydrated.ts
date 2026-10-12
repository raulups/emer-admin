"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * `false` durante el render del servidor y la hidratacion, `true` despues.
 * Util para portales (`createPortal`) sin provocar desajustes de hidratacion
 * ni llamar a setState dentro de un efecto.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
