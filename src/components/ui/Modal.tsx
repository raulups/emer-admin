"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useIsHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Texto pequeno bajo el titulo. */
  subtitle?: ReactNode;
  /** Botonera inferior. Se queda fija abajo aunque el contenido haga scroll. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Desactiva el cierre al pulsar fuera o con Escape (p. ej. durante un guardado). */
  dismissable?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
} as const;

/** Modales abiertos, del mas antiguo al mas reciente: Escape solo cierra el de arriba. */
const openStack: string[] = [];

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  footer,
  size = "md",
  dismissable = true,
  className,
  bodyClassName,
  children,
}: ModalProps) {
  const hydrated = useIsHydrated();
  const id = useId();
  const closeRef = useRef(onClose);
  const dismissableRef = useRef(dismissable);

  useEffect(() => {
    closeRef.current = onClose;
    dismissableRef.current = dismissable;
  }, [onClose, dismissable]);

  useEffect(() => {
    if (!open) return;

    openStack.push(id);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || openStack.at(-1) !== id) return;
      if (!dismissableRef.current) return;
      event.stopPropagation();
      closeRef.current();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const index = openStack.lastIndexOf(id);
      if (index !== -1) openStack.splice(index, 1);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, id]);

  if (!hydrated || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:items-center sm:p-6">
      <div
        className="bg-ink/60 animate-fade fixed inset-0"
        onClick={dismissable ? onClose : undefined}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={cn(
          "border-ink bg-paper shadow-hard-lg animate-pop relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full flex-col border-2 sm:max-h-[calc(100dvh-3rem)]",
          SIZES[size],
          className,
        )}
      >
        {title ? (
          <div className="border-ink bg-ink text-cream flex shrink-0 items-center justify-between gap-3 border-b-2 px-4 py-2.5">
            <div className="min-w-0">
              <h2 className="truncate text-sm tracking-wider">{title}</h2>
              {subtitle ? <p className="text-cream/60 truncate text-[11px]">{subtitle}</p> : null}
            </div>
            {dismissable ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                title="Cerrar (Esc)"
                className="border-cream text-cream hover:bg-cream hover:text-ink flex size-6 shrink-0 cursor-pointer items-center justify-center border-2 text-xs font-bold transition-colors duration-[120ms]"
              >
                X
              </button>
            ) : null}
          </div>
        ) : null}

        <div className={cn("min-h-0 flex-1 overflow-y-auto p-4", bodyClassName)}>{children}</div>

        {footer ? (
          <div className="border-ink bg-paper flex shrink-0 items-center justify-end gap-2 border-t-2 px-4 py-2.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
