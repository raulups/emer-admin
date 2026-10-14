"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useIsHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Botonera inferior. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Desactiva el cierre al pulsar fuera o con Escape (p. ej. durante un guardado). */
  dismissable?: boolean;
  className?: string;
  children?: ReactNode;
}

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
} as const;

export function Modal({
  open,
  onClose,
  title,
  footer,
  size = "md",
  dismissable = true,
  className,
  children,
}: ModalProps) {
  const hydrated = useIsHydrated();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissable) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, dismissable, onClose]);

  if (!hydrated || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
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
          "border-ink bg-paper shadow-hard-lg animate-pop relative z-10 w-full border-2",
          SIZES[size],
          className,
        )}
      >
        {title ? (
          <div className="border-ink bg-ink text-cream flex items-center justify-between gap-3 border-b-2 px-4 py-2.5">
            <h2 className="truncate text-sm tracking-wider">{title}</h2>
            {dismissable ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="border-cream text-cream hover:bg-cream hover:text-ink flex size-6 cursor-pointer items-center justify-center border-2 text-xs font-bold transition-colors duration-[120ms]"
              >
                X
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="p-4">{children}</div>

        {footer ? (
          <div className="border-ink flex items-center justify-end gap-2 border-t-2 px-4 py-2.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
